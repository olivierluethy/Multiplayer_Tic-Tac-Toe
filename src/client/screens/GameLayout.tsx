import type { ReactNode } from 'react';
import './game.css';

interface GameLayoutProps {
  title: string;
  onBack: () => void;
  /** Status cluster shown top-right (connection, latency, etc.). */
  topRight?: ReactNode;
  /** Turn / status line above the board. */
  status: ReactNode;
  /** The board (and any overlay) — kept in a positioned stage. */
  children: ReactNode;
  /** Controls below the board. */
  footer?: ReactNode;
}

export function GameLayout({ title, onBack, topRight, status, children, footer }: GameLayoutProps) {
  return (
    <main className="game">
      <header className="game__bar">
        <button className="game__back" onClick={onBack} aria-label="Leave and go home">
          ‹ <span>Home</span>
        </button>
        <span className="game__title">{title}</span>
        <div className="game__top-right">{topRight}</div>
      </header>

      <div className="game__status">{status}</div>

      <div className="game__stage">{children}</div>

      {footer && <footer className="game__footer">{footer}</footer>}
    </main>
  );
}
