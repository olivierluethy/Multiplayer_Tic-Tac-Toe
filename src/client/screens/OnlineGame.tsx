import type { Mark } from '@shared/game/types.ts';
import { Board } from '../components/Board.tsx';
import { Button } from '../components/Button.tsx';
import { RoomBar } from '../components/RoomBar.tsx';
import { ScoreBoard, type ScoreEntry } from '../components/ScoreBoard.tsx';
import { ResultOverlay } from '../components/ResultOverlay.tsx';
import { ConnectionDot, LatencyBadge, TurnPill } from '../components/status.tsx';
import { GameLayout } from './GameLayout.tsx';
import { useOnlineGame, type OnlineView } from '../hooks/useOnlineGame.ts';
import './online.css';

type Mode = { kind: 'create' } | { kind: 'join'; code: string };

export function OnlineGame({ mode, onBack }: { mode: Mode; onBack: () => void }) {
  const g = useOnlineGame(mode, onBack);

  if (g.notFound) {
    return (
      <GameLayout title="Online" onBack={onBack} status={null}>
        <div className="panel panel--center">
          <h2 className="panel__title">Room not found</h2>
          <p className="panel__text">
            No active room with that code. It may have closed after inactivity.
          </p>
          <Button variant="primary" onClick={onBack}>
            Back home
          </Button>
        </div>
      </GameLayout>
    );
  }

  if (!g.view) {
    return (
      <GameLayout
        title="Online"
        onBack={onBack}
        topRight={<ConnectionDot state={g.conn} />}
        status={<TurnPill>Connecting…</TurnPill>}
      >
        <div className="panel panel--center">
          <div className="spinner" aria-hidden="true" />
          <p className="panel__text">
            {mode.kind === 'create' ? 'Creating your room…' : 'Joining the room…'}
          </p>
        </div>
      </GameLayout>
    );
  }

  return <OnlineBoardScreen g={g} view={g.view} onBack={onBack} />;
}

function playerBySeat(view: OnlineView, seat: Mark) {
  return view.players.find((p) => p.seat === seat) ?? null;
}

function OnlineBoardScreen({
  g,
  view,
  onBack,
}: {
  g: ReturnType<typeof useOnlineGame>;
  view: OnlineView;
  onBack: () => void;
}) {
  const { game, you, phase } = view;
  const isSpectator = you.isSpectator;
  const over = game.status !== 'playing';
  const yourTurn = !isSpectator && you.seat === game.turn && !over && phase === 'playing';
  const interactive = yourTurn;

  const xp = playerBySeat(view, 'X');
  const op = playerBySeat(view, 'O');
  const scoreEntries: ScoreEntry[] = [
    { label: xp?.nickname ?? 'X', value: xp?.wins ?? 0, mark: 'X', you: you.seat === 'X' },
    { label: 'Draws', value: view.draws },
    { label: op?.nickname ?? 'O', value: op?.wins ?? 0, mark: 'O', you: you.seat === 'O' },
  ];

  const statusPill = renderStatus(view, { isSpectator, over, yourTurn });

  const youAccepted = you.slot !== null ? view.rematch[you.slot === 0 ? 'slot0' : 'slot1'] : false;
  const oppAccepted =
    you.slot !== null ? view.rematch[you.slot === 0 ? 'slot1' : 'slot0'] : false;

  return (
    <GameLayout
      title="Online"
      onBack={g.leave}
      topRight={
        <>
          <LatencyBadge rtt={g.rtt} />
          <ConnectionDot state={g.conn} />
        </>
      }
      status={statusPill}
      footer={
        <>
          {phase === 'waiting' && <RoomBar code={view.code} />}
          {phase === 'opponent-left' && <RoomBar code={view.code} />}
          <ScoreBoard entries={scoreEntries} />
          {g.error && <div className="toast">{g.error}</div>}
          <div className="game__controls">
            <Button variant="secondary" onClick={g.leave}>
              Leave
            </Button>
          </div>
        </>
      }
    >
      <Board
        board={game.board}
        localMark={isSpectator ? null : you.seat}
        interactive={interactive}
        turn={game.turn}
        winningLine={game.winningLine}
        onPlay={g.play}
      />

      {phase === 'opponent-disconnected' && (
        <div className="stage-banner">
          <span className="stage-banner__dot" />
          Opponent disconnected — holding their seat
          {view.holdSecondsLeft != null ? ` (${view.holdSecondsLeft}s)` : ''}…
        </div>
      )}

      {phase === 'opponent-left' && (
        <ResultOverlay
          title="Opponent left"
          tone="neutral"
          detail="Their seat is open again — share your code to invite someone new."
          actions={
            <Button variant="secondary" onClick={g.leave}>
              Back home
            </Button>
          }
        />
      )}

      {over && phase === 'playing' && (
        <ResultOverlay
          title={resultTitle(view, isSpectator)}
          tone={resultTone(view, isSpectator)}
          detail={
            isSpectator ? (
              'Spectating — waiting for the players to rematch.'
            ) : (
              <span className="mono">
                {xp?.wins ?? 0} · {view.draws} · {op?.wins ?? 0}
              </span>
            )
          }
          actions={
            isSpectator ? (
              <Button variant="secondary" onClick={onBack}>
                Home
              </Button>
            ) : (
              <>
                <Button variant="primary" onClick={g.rematch} disabled={youAccepted}>
                  {youAccepted ? 'Waiting for opponent…' : oppAccepted ? 'Accept rematch' : 'Rematch'}
                </Button>
                <Button variant="secondary" onClick={g.leave}>
                  Leave
                </Button>
              </>
            )
          }
        />
      )}
    </GameLayout>
  );
}

function renderStatus(
  view: OnlineView,
  s: { isSpectator: boolean; over: boolean; yourTurn: boolean },
) {
  const { game, phase } = view;
  if (phase === 'waiting') return <TurnPill>Waiting for an opponent…</TurnPill>;
  if (phase === 'opponent-disconnected') return <TurnPill>Opponent reconnecting…</TurnPill>;
  if (phase === 'opponent-left') return <TurnPill>Opponent left</TurnPill>;
  if (s.over) {
    return <TurnPill>{game.status === 'draw' ? 'Draw' : `${game.winner} wins`}</TurnPill>;
  }
  if (s.isSpectator) return <TurnPill mark={game.turn}>{game.turn} to move</TurnPill>;
  return <TurnPill mark={game.turn}>{s.yourTurn ? 'Your turn' : "Opponent's turn"}</TurnPill>;
}

function resultTitle(view: OnlineView, isSpectator: boolean): string {
  const { game, you } = view;
  if (game.status === 'draw') return 'Draw';
  if (isSpectator) return `${game.winner} wins`;
  return game.winner === you.seat ? 'You win' : 'You lose';
}

function resultTone(view: OnlineView, isSpectator: boolean): 'win' | 'loss' | 'draw' | 'neutral' {
  const { game, you } = view;
  if (game.status === 'draw') return 'draw';
  if (isSpectator) return 'neutral';
  return game.winner === you.seat ? 'win' : 'loss';
}
