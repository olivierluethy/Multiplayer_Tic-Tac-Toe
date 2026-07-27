import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Board as BoardType, Line, Mark } from '@shared/game/types.ts';
import { seatVars } from '../theme.ts';
import './board.css';

interface BoardProps {
  board: BoardType;
  /** The mark that would be placed by the local player (drives hover ghost + turn hue). */
  localMark: Mark | null;
  /** Whether the local player can place right now. */
  interactive: boolean;
  /** The mark whose turn it currently is (drives --turn hue). */
  turn: Mark;
  winningLine: Line | null;
  onPlay: (index: number) => void;
}

/** Grid neighbours for arrow-key navigation. */
function move(index: number, key: string): number {
  const row = Math.floor(index / 3);
  const col = index % 3;
  switch (key) {
    case 'ArrowUp':
      return ((row + 2) % 3) * 3 + col;
    case 'ArrowDown':
      return ((row + 1) % 3) * 3 + col;
    case 'ArrowLeft':
      return row * 3 + ((col + 2) % 3);
    case 'ArrowRight':
      return row * 3 + ((col + 1) % 3);
    default:
      return index;
  }
}

export function Board({
  board,
  localMark,
  interactive,
  turn,
  winningLine,
  onPlay,
}: BoardProps) {
  const [focus, setFocus] = useState(0);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const winning = winningLine ? new Set(winningLine) : null;
  const hasWin = winning !== null;

  const focusCell = useCallback((index: number) => {
    setFocus(index);
    cellRefs.current[index]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        focusCell(move(index, event.key));
      }
    },
    [focusCell],
  );

  // Keep roving tabindex in range if the focused button unmounts logic changes.
  useEffect(() => {
    if (focus < 0 || focus > 8) setFocus(0);
  }, [focus]);

  const style: CSSProperties = seatVars(turn);

  return (
    <div
      className={`board${interactive ? ' board--live' : ''}`}
      style={style}
      role="grid"
      aria-label="Tic-Tac-Toe board"
    >
      {board.map((cell, index) => {
        const isWin = winning?.has(index) ?? false;
        const dimmed = hasWin && !isWin && cell !== null;
        const classes = [
          'cell',
          cell === 'X' ? 'cell--x' : cell === 'O' ? 'cell--o' : 'cell--empty',
          isWin ? 'cell--win' : '',
          dimmed ? 'cell--dim' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const playable = interactive && cell === null;
        const label =
          cell !== null
            ? `Cell ${index + 1}, ${cell}`
            : `Cell ${index + 1}, empty${playable ? ', your move' : ''}`;

        return (
          <button
            key={index}
            ref={(el) => {
              cellRefs.current[index] = el;
            }}
            className={classes}
            type="button"
            role="gridcell"
            aria-label={label}
            aria-disabled={!playable || undefined}
            tabIndex={focus === index ? 0 : -1}
            data-ghost={playable && localMark ? localMark : undefined}
            onFocus={() => setFocus(index)}
            onKeyDown={(e) => onKeyDown(e, index)}
            onClick={() => playable && onPlay(index)}
          >
            <span className="cell__mark" aria-hidden="true">
              {cell}
            </span>
          </button>
        );
      })}
    </div>
  );
}
