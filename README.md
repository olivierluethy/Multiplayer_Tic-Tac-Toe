# Multiplayer Tic-Tac-Toe

Fast, dark-mode-only Tic-Tac-Toe with three ways to play:

- **Pass & Play** — two players on one device.
- **Vs. Bot** — a local AI with three levels (Easy, Normal, Perfect). Perfect never loses.
- **Online** — create a room, share a 4-letter code or link, and play a friend in real time over raw WebSockets with the lowest achievable latency.

No accounts, no database, no sign-up. Built with **Vite + React 18 + TypeScript (strict)** on the client and a **Node 20+ `ws`** server that serves the built app and the WebSocket endpoint on the **same origin**.

## Quick start

```bash
pnpm install
pnpm dev      # Vite on http://localhost:5173, ws server on :8080 (proxied at /ws)
```

Open http://localhost:5173. For online play, open a second tab/device, create a room in one and join with the code in the other.

## Production

```bash
pnpm build    # typecheck + Vite build → dist/
pnpm start    # Node server serves dist/ and /ws on one origin (default :8080)
```

Then open http://localhost:8080.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | HTTP + WebSocket port for the Node server. |

Room lifetime (30 min idle TTL), reconnect hold (30 s), and heartbeat interval are constants in `src/server/config.ts`.

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` | Vite dev server + `tsx watch` server, concurrently. |
| `pnpm build` | Typecheck all projects, then build the client to `dist/`. |
| `pnpm start` | Run the production server (serves `dist/` + `/ws`). |
| `pnpm typecheck` | Strict TypeScript check for client, server, and tooling. |
| `pnpm lint` | ESLint (flat config). |

## Project layout

```
src/
  shared/            # pure, framework-free, imported by BOTH client and server
    game/            # board, rules, win/draw, applyMove reducer  ← single source of truth
    bot/             # minimax + alpha-beta + memoisation, 3 difficulties
    protocol/        # WebSocket message types (discriminated unions) + codec
    ids.ts           # room-code alphabet / validation
  client/            # Vite + React app (dark-only, tokens from docs/STYLEGUIDE.md)
    components/       # board, buttons, status, scoreboard, overlay, room bar
    screens/          # home, pass & play, vs bot, online
    net/              # reconnecting WebSocket client (backoff, queue, RTT)
    hooks/            # online-game state machine
  server/            # Node http + ws (rooms, static serving, heartbeat, sweeper)
docs/
  AUDIT.md           # audit of the previous codebase + binding lessons
  STYLEGUIDE.md      # the dark-only visual system (source of truth for UI)
```

## How the realtime layer works

- **One origin, one process.** The Node server serves the built client and upgrades WebSockets only on `/ws`. No CORS, no extra hop. `perMessageDeflate` is **off** — payloads are tiny, so compression would only add latency.
- **Authoritative server, optimistic client.** The exact same `src/shared/game` rules run on both sides. Your own move is applied **optimistically** — it renders in the same frame as the click, never after a round trip. The server validates every move; on receipt it broadcasts the move to the opponent **before any other bookkeeping**, then updates its state. Illegal or out-of-turn moves are rejected and the client rolls back to the server snapshot.
- **Versioning.** Every server state message carries a monotonic `version`; the client discards anything out of order and adopts the echoed version of its own optimistic move.
- **Small messages.** A move is three fields (`index`, `seat`, `version`). Full snapshots are sent only on join, reconnect, rematch, and resync.
- **Rooms are in-memory.** A `Map` on the server, swept after 30 minutes idle. Room codes are 4 uppercase characters from an alphabet without ambiguous glyphs (no `O/0/I/1`).
- **Reconnect.** Each client holds a session token in `sessionStorage`. On a drop the seat is held for **30 seconds**; reconnecting within that window restores the seat and full state. After that the seat is released and the opponent sees a clear "opponent left" state.
- **Spectators.** A third person joining a full room watches read-only.
- **Rematch.** One button, both sides confirm, seats swap, and a running session score (per player + draws) is shown.
- **Latency indicator.** An application-level ping/pong every 5 s measures RTT, shown as a small badge with green / amber / red bands.

## Non-goals

Chat, emotes, matchmaking against strangers, leaderboards, cross-session persistence, larger boards or variant rules, accounts, analytics.
