/**
 * In-memory room store and all authoritative room logic. No database (audit
 * decision): rooms live in a Map with a 30-minute idle TTL swept elsewhere.
 *
 * The server is the source of truth for game state. Clients apply their own
 * moves optimistically, but every move is validated here against the shared
 * rules, and illegal / out-of-turn moves are rejected.
 */

import { randomInt } from 'node:crypto';
import type { WebSocket } from 'ws';

import { applyMove, initialState, other } from '@shared/game/board.ts';
import type { GameState, Mark } from '@shared/game/types.ts';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@shared/ids.ts';
import {
  encode,
  type PlayerView,
  type RoomPhase,
  type ServerMsg,
  type Slot,
  type Snapshot,
} from '@shared/protocol/messages.ts';
import { RECONNECT_HOLD_MS } from './config.ts';

interface Player {
  slot: Slot;
  sessionToken: string;
  nickname: string | null;
  /** Current seat this round; swaps on rematch. */
  seat: Mark;
  wins: number;
  ws: WebSocket | null;
  connected: boolean;
  /** Timer that releases the seat when the reconnect hold expires. */
  holdTimer: ReturnType<typeof setTimeout> | null;
  holdDeadline: number | null;
}

export interface Room {
  code: string;
  version: number;
  game: GameState;
  phase: RoomPhase;
  players: Player[];
  spectators: Set<WebSocket>;
  draws: number;
  rematch: [boolean, boolean];
  lastActivity: number;
}

function send(ws: WebSocket, msg: ServerMsg): void {
  // 1 === WebSocket.OPEN; avoid importing the value just for the constant.
  if (ws.readyState === 1) ws.send(encode(msg));
}

function now(): number {
  return Date.now();
}

export class RoomStore {
  private readonly rooms = new Map<string, Room>();
  /** Reverse index: which room a live socket belongs to. */
  private readonly socketRoom = new Map<WebSocket, string>();

  get size(): number {
    return this.rooms.size;
  }

  entries(): IterableIterator<Room> {
    return this.rooms.values();
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    // Astronomically unlikely with a 32^4 space and few rooms.
    throw new Error('could not allocate a unique room code');
  }

  // ── Views / snapshots ──────────────────────────────────────────────────────

  private playerViews(room: Room): PlayerView[] {
    return room.players.map((p) => ({
      slot: p.slot,
      seat: p.seat,
      nickname: p.nickname,
      connected: p.connected,
      wins: p.wins,
    }));
  }

  private holdSecondsLeft(room: Room): number | undefined {
    if (room.phase !== 'opponent-disconnected') return undefined;
    const held = room.players.find((p) => !p.connected && p.holdDeadline != null);
    if (!held || held.holdDeadline == null) return undefined;
    return Math.max(0, Math.ceil((held.holdDeadline - now()) / 1000));
  }

  private snapshotFor(room: Room, ws: WebSocket): Snapshot {
    const me = room.players.find((p) => p.ws === ws);
    const hold = this.holdSecondsLeft(room);
    return {
      code: room.code,
      version: room.version,
      phase: room.phase,
      game: room.game,
      players: this.playerViews(room),
      draws: room.draws,
      you: me
        ? { slot: me.slot, seat: me.seat, isSpectator: false }
        : { slot: null, seat: null, isSpectator: true },
      rematch: { slot0: room.rematch[0], slot1: room.rematch[1] },
      ...(hold !== undefined ? { holdSecondsLeft: hold } : {}),
    };
  }

  private sendSnapshot(room: Room, ws: WebSocket): void {
    send(ws, { t: 'snapshot', snapshot: this.snapshotFor(room, ws) });
  }

  /** Snapshot everyone in the room (each gets their own `you`). */
  private broadcastSnapshot(room: Room): void {
    for (const p of room.players) {
      if (p.ws) this.sendSnapshot(room, p.ws);
    }
    for (const ws of room.spectators) this.sendSnapshot(room, ws);
  }

  private broadcastPresence(room: Room): void {
    const msg: ServerMsg = {
      t: 'presence',
      phase: room.phase,
      players: this.playerViews(room),
      version: room.version,
      ...(this.holdSecondsLeft(room) !== undefined
        ? { holdSecondsLeft: this.holdSecondsLeft(room)! }
        : {}),
    };
    this.everySocket(room, (ws) => send(ws, msg));
  }

  private everySocket(room: Room, fn: (ws: WebSocket) => void): void {
    for (const p of room.players) if (p.ws) fn(p.ws);
    for (const ws of room.spectators) fn(ws);
  }

  // ── Join / create ───────────────────────────────────────────────────────────

  createRoom(ws: WebSocket, sessionToken: string, nickname: string | null): Room {
    const code = this.generateCode();
    const player: Player = {
      slot: 0,
      sessionToken,
      nickname,
      seat: 'X',
      wins: 0,
      ws,
      connected: true,
      holdTimer: null,
      holdDeadline: null,
    };
    const room: Room = {
      code,
      version: 1,
      game: initialState(),
      phase: 'waiting',
      players: [player],
      spectators: new Set(),
      draws: 0,
      rematch: [false, false],
      lastActivity: now(),
    };
    this.rooms.set(code, room);
    this.socketRoom.set(ws, code);
    this.sendSnapshot(room, ws);
    return room;
  }

  /** Join by code: reconnect if the token matches a held seat, otherwise take an
   * open seat, otherwise spectate. Returns the room, or null if not found. */
  joinRoom(
    ws: WebSocket,
    code: string,
    sessionToken: string,
    nickname: string | null,
  ): Room | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    room.lastActivity = now();

    // Reconnect to an existing seat.
    const existing = room.players.find((p) => p.sessionToken === sessionToken);
    if (existing) {
      if (existing.holdTimer) {
        clearTimeout(existing.holdTimer);
        existing.holdTimer = null;
      }
      existing.holdDeadline = null;
      existing.ws = ws;
      existing.connected = true;
      if (nickname) existing.nickname = nickname;
      this.socketRoom.set(ws, code);
      this.recomputePhase(room);
      room.version++;
      this.sendSnapshot(room, ws);
      this.broadcastPresence(room);
      return room;
    }

    // Take an open seat (max two players).
    if (room.players.length < 2) {
      const player: Player = {
        slot: 1,
        sessionToken,
        nickname,
        seat: 'O',
        wins: 0,
        ws,
        connected: true,
        holdTimer: null,
        holdDeadline: null,
      };
      room.players.push(player);
      this.socketRoom.set(ws, code);
      this.recomputePhase(room);
      room.version++;
      this.broadcastSnapshot(room);
      return room;
    }

    // Room full → spectator.
    room.spectators.add(ws);
    this.socketRoom.set(ws, code);
    this.sendSnapshot(room, ws);
    return room;
  }

  private recomputePhase(room: Room): void {
    const active = room.players.filter((p) => p.connected).length;
    if (room.players.length < 2) {
      room.phase = 'waiting';
    } else if (active < 2) {
      // Only reachable transiently; disconnect sets 'opponent-disconnected'.
      room.phase = 'opponent-disconnected';
    } else {
      room.phase = 'playing';
    }
  }

  // ── Moves ────────────────────────────────────────────────────────────────────

  handleMove(ws: WebSocket, index: number): void {
    const room = this.roomOf(ws);
    if (!room) return;
    const player = room.players.find((p) => p.ws === ws);
    if (!player) {
      send(ws, {
        t: 'rejected',
        reason: 'not-a-player',
        snapshot: this.snapshotFor(room, ws),
      });
      return;
    }

    const result = applyMove(room.game, index, player.seat);
    if (!result.ok) {
      send(ws, {
        t: 'rejected',
        reason: result.reason,
        snapshot: this.snapshotFor(room, ws),
      });
      return;
    }

    // Broadcast the move to everyone else the instant it is accepted, before any
    // further bookkeeping — this is the latency-critical path (audit lesson).
    room.version++;
    const version = room.version;
    const seat = player.seat;
    this.everySocket(room, (peer) => {
      if (peer !== ws) send(peer, { t: 'move', index, seat, version });
    });
    // Confirm to the mover too, so it reconciles its optimistic version.
    send(ws, { t: 'move', index, seat, version });

    // Bookkeeping.
    room.game = result.state;
    room.lastActivity = now();
    if (result.state.status === 'won') {
      const winner = room.players.find((p) => p.seat === result.state.winner);
      if (winner) winner.wins++;
      this.broadcastSnapshot(room); // sync final board + score
    } else if (result.state.status === 'draw') {
      room.draws++;
      this.broadcastSnapshot(room);
    }
  }

  // ── Rematch ────────────────────────────────────────────────────────────────

  handleRematch(ws: WebSocket): void {
    const room = this.roomOf(ws);
    if (!room) return;
    const player = room.players.find((p) => p.ws === ws);
    if (!player) return;
    room.lastActivity = now();

    room.rematch[player.slot] = true;
    this.everySocket(room, (peer) =>
      send(peer, { t: 'rematch-state', slot0: room.rematch[0], slot1: room.rematch[1] }),
    );

    if (room.rematch[0] && room.rematch[1] && room.players.length === 2) {
      // Swap seats, reset the board. X always moves first, so swapping changes
      // who opens.
      for (const p of room.players) p.seat = other(p.seat);
      room.game = initialState();
      room.rematch = [false, false];
      room.phase = 'playing';
      room.version++;
      this.broadcastSnapshot(room);
    }
  }

  // ── Disconnect / leave ───────────────────────────────────────────────────────

  handleDisconnect(ws: WebSocket): void {
    const room = this.roomOf(ws);
    this.socketRoom.delete(ws);
    if (!room) return;

    if (room.spectators.delete(ws)) return; // spectator left; nothing else to do

    const player = room.players.find((p) => p.ws === ws);
    if (!player) return;

    player.ws = null;
    player.connected = false;
    room.phase = 'opponent-disconnected';
    player.holdDeadline = now() + RECONNECT_HOLD_MS;
    player.holdTimer = setTimeout(() => this.releaseSeat(room, player), RECONNECT_HOLD_MS);
    room.version++;
    this.broadcastPresence(room);
  }

  /** Explicit leave: release immediately, no hold. */
  handleLeave(ws: WebSocket): void {
    const room = this.roomOf(ws);
    if (!room) {
      this.socketRoom.delete(ws);
      return;
    }
    if (room.spectators.delete(ws)) {
      this.socketRoom.delete(ws);
      return;
    }
    const player = room.players.find((p) => p.ws === ws);
    this.socketRoom.delete(ws);
    if (player) {
      if (player.holdTimer) clearTimeout(player.holdTimer);
      this.releaseSeat(room, player);
    }
  }

  private releaseSeat(room: Room, player: Player): void {
    if (player.holdTimer) {
      clearTimeout(player.holdTimer);
      player.holdTimer = null;
    }
    room.players = room.players.filter((p) => p !== player);
    room.rematch = [false, false];
    room.version++;

    if (room.players.length === 0 && room.spectators.size === 0) {
      this.rooms.delete(room.code);
      return;
    }
    room.phase = room.players.length < 2 ? 'opponent-left' : 'playing';
    this.broadcastPresence(room);
    this.broadcastSnapshot(room);
  }

  // ── Ping ─────────────────────────────────────────────────────────────────────

  handlePing(ws: WebSocket, ts: number): void {
    send(ws, { t: 'pong', ts });
    const room = this.roomOf(ws);
    if (room) room.lastActivity = now();
  }

  // ── Sweeping ───────────────────────────────────────────────────────────────

  sweep(ttlMs: number): number {
    const cutoff = now() - ttlMs;
    let removed = 0;
    for (const room of this.rooms.values()) {
      if (room.lastActivity < cutoff) {
        this.everySocket(room, (ws) => {
          send(ws, { t: 'error', code: 'room-closed', message: 'Room closed after inactivity.' });
        });
        for (const p of room.players) if (p.holdTimer) clearTimeout(p.holdTimer);
        this.rooms.delete(room.code);
        removed++;
      }
    }
    return removed;
  }

  private roomOf(ws: WebSocket): Room | undefined {
    const code = this.socketRoom.get(ws);
    return code ? this.rooms.get(code) : undefined;
  }
}
