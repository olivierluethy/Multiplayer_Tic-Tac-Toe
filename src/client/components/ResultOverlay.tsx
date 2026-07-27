import type { ReactNode } from 'react';
import './overlay.css';

type Tone = 'win' | 'loss' | 'draw' | 'neutral';

interface ResultOverlayProps {
  title: string;
  tone: Tone;
  detail?: ReactNode;
  actions: ReactNode;
}

export function ResultOverlay({ title, tone, detail, actions }: ResultOverlayProps) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="overlay__card">
        <span className="eyebrow">Round over</span>
        <h2 className={`overlay__title overlay__title--${tone}`}>{title}</h2>
        {detail && <div className="overlay__detail">{detail}</div>}
        <div className="overlay__actions">{actions}</div>
      </div>
    </div>
  );
}
