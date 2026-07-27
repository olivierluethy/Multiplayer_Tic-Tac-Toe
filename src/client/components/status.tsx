import type { ReactNode } from 'react';
import type { Mark } from '@shared/game/types.ts';
import { seatVars } from '../theme.ts';
import './status.css';

/** Turn / status pill, tinted to a seat when given one. */
export function TurnPill({ mark, children }: { mark?: Mark; children: ReactNode }) {
  return (
    <div className={`pill${mark ? ' pill--turn' : ''}`} style={mark ? seatVars(mark) : undefined}>
      {mark && <span className="pill__dot" aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}

export type ConnState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const CONN_LABEL: Record<ConnState, string> = {
  connecting: 'Connecting',
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  disconnected: 'Disconnected',
};

export function ConnectionDot({ state }: { state: ConnState }) {
  return (
    <div className={`conn conn--${state}`} title={CONN_LABEL[state]}>
      <span className="conn__dot" aria-hidden="true" />
      <span className="conn__label">{CONN_LABEL[state]}</span>
    </div>
  );
}

/** RTT badge with green/amber/red bands (styleguide latency bands). */
export function LatencyBadge({ rtt }: { rtt: number | null }) {
  const band = rtt == null ? 'none' : rtt <= 80 ? 'good' : rtt <= 180 ? 'mid' : 'bad';
  return (
    <div className={`lat lat--${band}`} title="Round-trip time to the server">
      <span className="lat__dot" aria-hidden="true" />
      <span className="lat__value mono">{rtt == null ? '—' : `${rtt}ms`}</span>
    </div>
  );
}
