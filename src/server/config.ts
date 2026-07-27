/** Server tunables, all in one place. */

export const PORT = Number(process.env.PORT ?? 8080);

/** How long a seat is held after a disconnect before it is released. */
export const RECONNECT_HOLD_MS = 30_000;

/** Idle rooms are swept after this long with no activity. */
export const ROOM_TTL_MS = 30 * 60_000;

/** How often the sweeper runs. */
export const SWEEP_INTERVAL_MS = 60_000;

/** ws-level heartbeat: ping every interval, terminate sockets that miss a pong. */
export const HEARTBEAT_INTERVAL_MS = 15_000;

/** Absolute directory of the built client, served in production. */
export const CLIENT_DIST = 'dist';
