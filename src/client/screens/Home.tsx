import { useState, type FormEvent } from 'react';
import { isValidRoomCode } from '@shared/ids.ts';
import { Button } from '../components/Button.tsx';
import { getNickname, setNickname } from '../session.ts';
import './home.css';

interface HomeProps {
  onLocal: () => void;
  onBot: () => void;
  onCreateOnline: () => void;
  onJoinOnline: (code: string) => void;
}

export function Home({ onLocal, onBot, onCreateOnline, onJoinOnline }: HomeProps) {
  const [nick, setNick] = useState(getNickname);
  const [code, setCode] = useState('');
  const trimmed = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const canJoin = isValidRoomCode(trimmed);

  const submitJoin = (e: FormEvent) => {
    e.preventDefault();
    setNickname(nick);
    if (canJoin) onJoinOnline(trimmed);
  };

  const withNick = (fn: () => void) => () => {
    setNickname(nick);
    fn();
  };

  return (
    <main className="home">
      <header className="home__hero">
        <span className="eyebrow">Real-time · dark · no sign-up</span>
        <h1 className="home__title">
          <span className="home__x">TIC</span>
          <span className="home__sep">·</span>
          <span className="home__o">TAC</span>
          <span className="home__sep">·</span>
          <span className="home__x">TOE</span>
        </h1>
        <p className="home__tagline">
          Play across the table, against the bot, or online with a friend — lowest
          latency, no accounts.
        </p>
      </header>

      <section className="home__modes" aria-label="Choose a mode">
        <button className="mode" onClick={withNick(onLocal)}>
          <span className="mode__glyph mode__glyph--pass" aria-hidden="true">
            <span className="mode__x">X</span>
            <span className="mode__o">O</span>
          </span>
          <span className="mode__name">Pass &amp; Play</span>
          <span className="mode__desc">Two players, one device.</span>
        </button>

        <button className="mode" onClick={withNick(onBot)}>
          <span className="mode__glyph mode__glyph--bot" aria-hidden="true">◇</span>
          <span className="mode__name">Vs. Bot</span>
          <span className="mode__desc">Easy, Normal, or Perfect.</span>
        </button>

        <button className="mode mode--accent" onClick={withNick(onCreateOnline)}>
          <span className="mode__glyph mode__glyph--online" aria-hidden="true">⇄</span>
          <span className="mode__name">Play Online</span>
          <span className="mode__desc">Create a room, share the code.</span>
        </button>
      </section>

      <form className="home__join" onSubmit={submitJoin}>
        <div className="home__join-row">
          <label className="home__field">
            <span className="eyebrow">Join a room</span>
            <input
              className="input input--code"
              value={trimmed}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CODE"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Room code"
              maxLength={4}
            />
          </label>
          <Button type="submit" variant="primary" disabled={!canJoin}>
            Join
          </Button>
        </div>
        <label className="home__field">
          <span className="eyebrow">Nickname (optional)</span>
          <input
            className="input"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="Anonymous"
            maxLength={20}
            aria-label="Nickname"
          />
        </label>
      </form>
    </main>
  );
}
