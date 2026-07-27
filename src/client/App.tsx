import { useCallback, useState } from 'react';
import { isValidRoomCode } from '@shared/ids.ts';
import { Home } from './screens/Home.tsx';
import { LocalGame } from './screens/LocalGame.tsx';
import { BotGame } from './screens/BotGame.tsx';
import { OnlineGame } from './screens/OnlineGame.tsx';
import './app.css';

type OnlineMode = { kind: 'create' } | { kind: 'join'; code: string };
type Route =
  | { name: 'home' }
  | { name: 'local' }
  | { name: 'bot' }
  | { name: 'online'; mode: OnlineMode };

function initialRoute(): Route {
  const room = new URLSearchParams(window.location.search).get('room');
  if (room) {
    const code = room.toUpperCase();
    if (isValidRoomCode(code)) return { name: 'online', mode: { kind: 'join', code } };
  }
  return { name: 'home' };
}

export function App() {
  const [route, setRoute] = useState<Route>(initialRoute);

  const goHome = useCallback(() => {
    // Drop any ?room= so a refresh lands on Home, not back into the room.
    window.history.replaceState(null, '', window.location.pathname);
    setRoute({ name: 'home' });
  }, []);

  switch (route.name) {
    case 'local':
      return <LocalGame onBack={goHome} />;
    case 'bot':
      return <BotGame onBack={goHome} />;
    case 'online':
      return <OnlineGame mode={route.mode} onBack={goHome} />;
    case 'home':
    default:
      return (
        <Home
          onLocal={() => setRoute({ name: 'local' })}
          onBot={() => setRoute({ name: 'bot' })}
          onCreateOnline={() => setRoute({ name: 'online', mode: { kind: 'create' } })}
          onJoinOnline={(code) => setRoute({ name: 'online', mode: { kind: 'join', code } })}
        />
      );
  }
}
