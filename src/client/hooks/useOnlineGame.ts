/**
 * Online-game state machine over the RealtimeClient. Applies the local player's
 * move optimistically (renders in the same frame as the click) and reconciles
 * against the authoritative server: adopts echoed deltas, applies opponent
 * deltas, and rolls back to the last snapshot on rejection. Out-of-order
 * messages (lower version) are discarded.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyMove } from '@shared/game/board.ts';
import type { GameState } from '@shared/game/types.ts';
import type { RoomPhase, ServerMsg, Snapshot } from '@shared/protocol/messages.ts';
import { RealtimeClient } from '../net/RealtimeClient.ts';
import type { ConnState } from '../components/status.tsx';
import { getNickname, getSessionToken } from '../session.ts';

export interface OnlineView {
  code: string;
  version: number;
  phase: RoomPhase;
  game: GameState;
  players: Snapshot['players'];
  draws: number;
  you: Snapshot['you'];
  rematch: Snapshot['rematch'];
  holdSecondsLeft: number | undefined;
}

export interface OnlineGame {
  view: OnlineView | null;
  conn: ConnState;
  rtt: number | null;
  error: string | null;
  notFound: boolean;
  play: (index: number) => void;
  rematch: () => void;
  leave: () => void;
}

type Mode = { kind: 'create' } | { kind: 'join'; code: string };

function snapshotToView(s: Snapshot): OnlineView {
  return {
    code: s.code,
    version: s.version,
    phase: s.phase,
    game: s.game,
    players: s.players,
    draws: s.draws,
    you: s.you,
    rematch: s.rematch,
    holdSecondsLeft: s.holdSecondsLeft,
  };
}

export function useOnlineGame(mode: Mode, onLeave: () => void): OnlineGame {
  const [view, setView] = useState<OnlineView | null>(null);
  const [conn, setConn] = useState<ConnState>('connecting');
  const [rtt, setRtt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const clientRef = useRef<RealtimeClient | null>(null);
  const roomCodeRef = useRef<string | null>(mode.kind === 'join' ? mode.code : null);
  const modeRef = useRef(mode);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  const sendJoinOrCreate = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    const sessionToken = getSessionToken();
    const nickname = getNickname() || undefined;
    const code = roomCodeRef.current;
    if (code) {
      client.send({ t: 'join', code, sessionToken, ...(nickname ? { nickname } : {}) });
    } else {
      client.send({ t: 'create', sessionToken, ...(nickname ? { nickname } : {}) });
    }
  }, []);

  const handleMessage = useCallback((msg: ServerMsg) => {
    switch (msg.t) {
      case 'snapshot': {
        roomCodeRef.current = msg.snapshot.code;
        setNotFound(false);
        setView(snapshotToView(msg.snapshot));
        break;
      }
      case 'move': {
        setView((prev) => {
          if (!prev || msg.version <= prev.version) return prev; // stale / echo already applied
          if (prev.game.board[msg.index] === msg.seat) {
            return { ...prev, version: msg.version }; // our optimistic move, now confirmed
          }
          const result = applyMove(prev.game, msg.index, msg.seat);
          if (!result.ok) return prev; // snapshot will reconcile
          return { ...prev, game: result.state, version: msg.version };
        });
        break;
      }
      case 'rejected': {
        setView(snapshotToView(msg.snapshot));
        setError(rejectionText(msg.reason));
        window.setTimeout(() => setError(null), 2000);
        break;
      }
      case 'presence': {
        setView((prev) =>
          prev
            ? {
                ...prev,
                phase: msg.phase,
                players: msg.players,
                version: Math.max(prev.version, msg.version),
                holdSecondsLeft: msg.holdSecondsLeft,
              }
            : prev,
        );
        break;
      }
      case 'rematch-state': {
        setView((prev) =>
          prev ? { ...prev, rematch: { slot0: msg.slot0, slot1: msg.slot1 } } : prev,
        );
        break;
      }
      case 'error': {
        if (msg.code === 'room-not-found') {
          // In create mode a missing room means our create raced with a cleanup
          // (dev StrictMode) or the room expired — recreate rather than dead-end.
          if (modeRef.current.kind === 'create') {
            roomCodeRef.current = null;
            sendJoinOrCreate();
          } else {
            setNotFound(true);
          }
        } else {
          setError(msg.message);
          if (msg.code === 'room-closed') window.setTimeout(() => onLeaveRef.current(), 2500);
        }
        break;
      }
      default:
        break;
    }
  }, [sendJoinOrCreate]);

  // Establish the connection once per mount.
  useEffect(() => {
    const client = new RealtimeClient({
      onMessage: handleMessage,
      onState: setConn,
      onRtt: setRtt,
      onOpen: sendJoinOrCreate,
    });
    clientRef.current = client;
    client.connect();
    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [handleMessage, sendJoinOrCreate]);

  const play = useCallback((index: number) => {
    setView((prev) => {
      if (!prev || !prev.you.seat || prev.you.isSpectator) return prev;
      if (prev.game.turn !== prev.you.seat || prev.game.status !== 'playing') return prev;
      const result = applyMove(prev.game, index, prev.you.seat);
      if (!result.ok) return prev;
      clientRef.current?.send({ t: 'move', index, baseVersion: prev.version });
      return { ...prev, game: result.state }; // optimistic; version bumps on echo
    });
  }, []);

  const rematch = useCallback(() => clientRef.current?.send({ t: 'rematch' }), []);

  const leave = useCallback(() => {
    clientRef.current?.close();
    onLeaveRef.current();
  }, []);

  return { view, conn, rtt, error, notFound, play, rematch, leave };
}

function rejectionText(reason: string): string {
  switch (reason) {
    case 'not-your-turn':
      return 'Not your turn.';
    case 'cell-taken':
      return 'That square is taken.';
    case 'game-over':
      return 'The round is over.';
    case 'not-a-player':
      return 'You are spectating.';
    default:
      return 'Move rejected.';
  }
}
