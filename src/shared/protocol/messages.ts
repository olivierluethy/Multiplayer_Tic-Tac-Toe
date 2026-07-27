/**
 * The realtime wire protocol. One place, shared by client and server, as
 * discriminated unions keyed on `t` (audit lesson #11). Messages are small and
 * flat: a move delta is three fields, full snapshots are sent only on join,
 * reconnect, rematch, and resync.
 */

import type { GameState, Mark } from '../game/types.ts';

export const WS_PATH = '/ws';
export const PROTOCOL_VERSION = 1;

/** Room/connection lifecycle, independent of the round result in `game`. */
export type RoomPhase =
  | 'waiting' // waiting for a second player
  | 'playing' // both seats present
  | 'opponent-disconnected' // a seat is held open during the 30s reconnect window
  | 'opponent-left'; // hold expired, the seat was released

/** A stable player slot (0 = room creator, 1 = joiner). Survives seat swaps so
 * the session score follows the person, not the X/O mark. */
export type Slot = 0 | 1;

export interface PlayerView {
  readonly slot: Slot;
  readonly seat: Mark;
  readonly nickname: string | null;
  readonly connected: boolean;
  /** Rounds this player has won this session. */
  readonly wins: number;
}

/** Full room state. Sent on join, reconnect, rematch, and resync only. */
export interface Snapshot {
  readonly code: string;
  /** Monotonic; the client discards any snapshot/delta older than what it has. */
  readonly version: number;
  readonly phase: RoomPhase;
  readonly game: GameState;
  readonly players: readonly PlayerView[];
  readonly draws: number;
  /** This client's identity in the room. Spectators have slot/seat null. */
  readonly you: {
    readonly slot: Slot | null;
    readonly seat: Mark | null;
    readonly isSpectator: boolean;
  };
  /** Rematch confirmations by slot. */
  readonly rematch: {
    readonly slot0: boolean;
    readonly slot1: boolean;
  };
  /** Seconds left on the opponent's reconnect hold (only in 'opponent-disconnected'). */
  readonly holdSecondsLeft?: number;
}

export type MoveRejectedReason =
  | 'out-of-range'
  | 'cell-taken'
  | 'not-your-turn'
  | 'game-over'
  | 'not-a-player'
  | 'version-mismatch';

// ── Client → Server ──────────────────────────────────────────────────────────

export interface CreateMsg {
  readonly t: 'create';
  readonly sessionToken: string;
  readonly nickname?: string;
}

export interface JoinMsg {
  readonly t: 'join';
  readonly code: string;
  readonly sessionToken: string;
  readonly nickname?: string;
}

export interface MoveMsg {
  readonly t: 'move';
  readonly index: number;
  /** The version the client based this move on, for divergence detection. */
  readonly baseVersion: number;
}

export interface RematchMsg {
  readonly t: 'rematch';
}

export interface LeaveMsg {
  readonly t: 'leave';
}

export interface PingMsg {
  readonly t: 'ping';
  /** Client clock at send, echoed back for RTT measurement. */
  readonly ts: number;
}

export type ClientMsg =
  | CreateMsg
  | JoinMsg
  | MoveMsg
  | RematchMsg
  | LeaveMsg
  | PingMsg;

// ── Server → Client ──────────────────────────────────────────────────────────

/** Full state. Carries the client's session identity for reconnect. */
export interface SnapshotMsg {
  readonly t: 'snapshot';
  readonly snapshot: Snapshot;
}

/** A single applied move. Broadcast to the room the instant the server accepts
 * it — the smallest possible message on the hot path. */
export interface MoveAppliedMsg {
  readonly t: 'move';
  readonly index: number;
  readonly seat: Mark;
  readonly version: number;
}

/** Sent only to the mover when the server rejects their move; the client rolls
 * back to `snapshot`. */
export interface MoveRejectedMsg {
  readonly t: 'rejected';
  readonly reason: MoveRejectedReason;
  readonly snapshot: Snapshot;
}

/** Presence / phase change without a full board resend where a snapshot would
 * be wasteful. */
export interface PresenceMsg {
  readonly t: 'presence';
  readonly phase: RoomPhase;
  readonly players: readonly PlayerView[];
  readonly version: number;
  readonly holdSecondsLeft?: number;
}

export interface RematchStateMsg {
  readonly t: 'rematch-state';
  readonly slot0: boolean;
  readonly slot1: boolean;
}

export interface PongMsg {
  readonly t: 'pong';
  /** The `ts` from the matching ping, echoed verbatim. */
  readonly ts: number;
}

export interface ErrorMsg {
  readonly t: 'error';
  readonly code: 'room-not-found' | 'room-closed' | 'bad-message' | 'server-error';
  readonly message: string;
}

export type ServerMsg =
  | SnapshotMsg
  | MoveAppliedMsg
  | MoveRejectedMsg
  | PresenceMsg
  | RematchStateMsg
  | PongMsg
  | ErrorMsg;

// ── Codec ────────────────────────────────────────────────────────────────────

export function encode(msg: ClientMsg | ServerMsg): string {
  return JSON.stringify(msg);
}

export function decodeClient(raw: string): ClientMsg | null {
  try {
    const value = JSON.parse(raw) as { t?: unknown };
    return typeof value?.t === 'string' ? (value as ClientMsg) : null;
  } catch {
    return null;
  }
}

export function decodeServer(raw: string): ServerMsg | null {
  try {
    const value = JSON.parse(raw) as { t?: unknown };
    return typeof value?.t === 'string' ? (value as ServerMsg) : null;
  } catch {
    return null;
  }
}
