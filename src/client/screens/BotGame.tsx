import { useCallback, useEffect, useRef, useState } from 'react';
import { applyMove, initialState, other } from '@shared/game/board.ts';
import type { GameState, Mark } from '@shared/game/types.ts';
import { chooseMove, type Difficulty } from '@shared/bot/bot.ts';
import { Board } from '../components/Board.tsx';
import { Button } from '../components/Button.tsx';
import { ScoreBoard } from '../components/ScoreBoard.tsx';
import { ResultOverlay } from '../components/ResultOverlay.tsx';
import { TurnPill } from '../components/status.tsx';
import { GameLayout } from './GameLayout.tsx';

const PLAYER: Mark = 'X';
const BOT: Mark = other(PLAYER);

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'normal', label: 'Normal' },
  { id: 'perfect', label: 'Perfect' },
];

export function BotGame({ onBack }: { onBack: () => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [game, setGame] = useState<GameState>(initialState);
  const [score, setScore] = useState({ you: 0, bot: 0, draws: 0 });
  const scheduledAt = useRef(-1);

  const record = useCallback((state: GameState) => {
    if (state.status === 'won') {
      setScore((s) =>
        state.winner === PLAYER ? { ...s, you: s.you + 1 } : { ...s, bot: s.bot + 1 },
      );
    } else if (state.status === 'draw') {
      setScore((s) => ({ ...s, draws: s.draws + 1 }));
    }
  }, []);

  const play = useCallback(
    (index: number) => {
      setGame((prev) => {
        if (prev.turn !== PLAYER || prev.status !== 'playing') return prev;
        const result = applyMove(prev, index, PLAYER);
        if (!result.ok) return prev;
        record(result.state);
        return result.state;
      });
    },
    [record],
  );

  // Bot moves when it is its turn, after a deliberate 300–500 ms pause.
  useEffect(() => {
    if (game.status !== 'playing' || game.turn !== BOT) return;
    if (scheduledAt.current === game.moveCount) return; // already scheduled this ply
    scheduledAt.current = game.moveCount;
    const delay = 300 + Math.random() * 200;
    const timer = window.setTimeout(() => {
      const index = chooseMove(game.board, BOT, difficulty, Math.random);
      setGame((prev) => {
        if (prev.turn !== BOT || prev.status !== 'playing') return prev;
        const result = applyMove(prev, index, BOT);
        if (!result.ok) return prev;
        record(result.state);
        return result.state;
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [game, difficulty, record]);

  const nextRound = useCallback(() => {
    scheduledAt.current = -1;
    setGame(initialState());
  }, []);

  const over = game.status !== 'playing';
  const yourTurn = game.turn === PLAYER && !over;

  return (
    <GameLayout
      title="Vs. Bot"
      onBack={onBack}
      status={
        over ? (
          <TurnPill>
            {game.status === 'draw' ? 'Draw' : game.winner === PLAYER ? 'You win' : 'Bot wins'}
          </TurnPill>
        ) : (
          <TurnPill mark={game.turn}>{yourTurn ? 'Your turn' : 'Bot is thinking…'}</TurnPill>
        )
      }
      footer={
        <>
          <div className="segmented" role="group" aria-label="Difficulty">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                className={`segmented__opt${difficulty === d.id ? ' segmented__opt--active' : ''}`}
                aria-pressed={difficulty === d.id}
                onClick={() => setDifficulty(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <ScoreBoard
            entries={[
              { label: 'X', value: score.you, mark: PLAYER, you: true },
              { label: 'Draws', value: score.draws },
              { label: 'Bot', value: score.bot, mark: BOT },
            ]}
          />
          <div className="game__controls">
            <Button variant="secondary" onClick={nextRound}>
              New round
            </Button>
          </div>
        </>
      }
    >
      <Board
        board={game.board}
        localMark={PLAYER}
        interactive={yourTurn}
        turn={game.turn}
        winningLine={game.winningLine}
        onPlay={play}
      />
      {over && (
        <ResultOverlay
          title={
            game.status === 'draw' ? 'Draw' : game.winner === PLAYER ? 'You win' : 'Bot wins'
          }
          tone={game.status === 'draw' ? 'draw' : game.winner === PLAYER ? 'win' : 'loss'}
          detail={
            difficulty === 'perfect' && game.status !== 'won'
              ? 'Perfect play can only be held to a draw.'
              : undefined
          }
          actions={
            <>
              <Button variant="primary" onClick={nextRound}>
                Play again
              </Button>
              <Button variant="secondary" onClick={onBack}>
                Home
              </Button>
            </>
          }
        />
      )}
    </GameLayout>
  );
}
