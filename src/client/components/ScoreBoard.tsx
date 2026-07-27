import type { Mark } from '@shared/game/types.ts';
import { markColor } from '../theme.ts';
import './scoreboard.css';

export interface ScoreEntry {
  label: string;
  value: number;
  /** Tint the value with a seat colour, if this entry is a player. */
  mark?: Mark;
  /** Emphasise (e.g. the local player). */
  you?: boolean;
}

export function ScoreBoard({ entries }: { entries: ScoreEntry[] }) {
  return (
    <div className="score" role="group" aria-label="Session score">
      {entries.map((e, i) => (
        <div className={`score__item${e.you ? ' score__item--you' : ''}`} key={i}>
          <span className="score__label">
            {e.you && <span className="score__you">You</span>}
            {e.label}
          </span>
          <span
            className="score__value mono"
            style={e.mark ? { color: markColor(e.mark) } : undefined}
          >
            {e.value}
          </span>
        </div>
      ))}
    </div>
  );
}
