import { useCallback, useState } from 'react';
import { applyMove, initialState } from '@shared/game/board.ts';
import type { GameState } from '@shared/game/types.ts';
import { Board } from '../components/Board.tsx';
import { Button } from '../components/Button.tsx';
import { ScoreBoard } from '../components/ScoreBoard.tsx';
import { ResultOverlay } from '../components/ResultOverlay.tsx';
import { TurnPill } from '../components/status.tsx';
import { GameLayout } from './GameLayout.tsx';

export function LocalGame({ onBack }: { onBack: () => void }) {
  const [game, setGame] = useState<GameState>(initialState);
  const [score, setScore] = useState({ X: 0, O: 0, draws: 0 });

  const play = useCallback(
    (index: number) => {
      setGame((prev) => {
        const result = applyMove(prev, index, prev.turn);
        if (!result.ok) return prev;
        if (result.state.status === 'won') {
          const w = result.state.winner!;
          setScore((s) => ({ ...s, [w]: s[w] + 1 }));
        } else if (result.state.status === 'draw') {
          setScore((s) => ({ ...s, draws: s.draws + 1 }));
        }
        return result.state;
      });
    },
    [],
  );

  const nextRound = useCallback(() => setGame(initialState()), []);

  const over = game.status !== 'playing';

  return (
    <GameLayout
      title="Pass & Play"
      onBack={onBack}
      status={
        over ? (
          <TurnPill>{game.status === 'draw' ? 'Draw' : `${game.winner} wins`}</TurnPill>
        ) : (
          <TurnPill mark={game.turn}>{game.turn}&rsquo;s turn</TurnPill>
        )
      }
      footer={
        <>
          <ScoreBoard
            entries={[
              { label: 'X', value: score.X, mark: 'X' },
              { label: 'Draws', value: score.draws },
              { label: 'O', value: score.O, mark: 'O' },
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
        localMark={game.turn}
        interactive={!over}
        turn={game.turn}
        winningLine={game.winningLine}
        onPlay={play}
      />
      {over && (
        <ResultOverlay
          title={game.status === 'draw' ? 'Draw' : `${game.winner} wins`}
          tone={game.status === 'draw' ? 'draw' : 'neutral'}
          detail={
            game.status === 'won'
              ? 'Nicely done. Swap the device and go again.'
              : 'All squares filled. Run it back.'
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
