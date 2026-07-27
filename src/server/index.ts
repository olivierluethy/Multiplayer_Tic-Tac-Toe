/**
 * The Node process: serves the built client and owns the /ws WebSocket endpoint
 * on the same origin (no CORS, no extra hop). Raw `ws`, perMessageDeflate off
 * (payloads are tiny; compression only adds latency — audit decision).
 */

import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';

import { decodeClient, WS_PATH } from '@shared/protocol/messages.ts';
import {
  CLIENT_DIST,
  HEARTBEAT_INTERVAL_MS,
  PORT,
  ROOM_TTL_MS,
  SWEEP_INTERVAL_MS,
} from './config.ts';
import { RoomStore } from './rooms.ts';
import { createStaticHandler } from './static.ts';

const rooms = new RoomStore();
const serveStatic = createStaticHandler(CLIENT_DIST);

const httpServer = createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  serveStatic(req, res);
});

const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });

// Only accept WebSocket upgrades on the dedicated path.
httpServer.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  if (pathname !== WS_PATH) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

// ── ws-level heartbeat (dead-socket detection, separate from app RTT ping) ────
const alive = new WeakSet<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  alive.add(ws);
  ws.on('pong', () => alive.add(ws));

  ws.on('message', (data) => {
    const msg = decodeClient(String(data));
    if (!msg) {
      ws.send(JSON.stringify({ t: 'error', code: 'bad-message', message: 'Unparseable message.' }));
      return;
    }
    try {
      routeMessage(ws, msg);
    } catch (err) {
      console.error('message handler error:', err);
      ws.send(
        JSON.stringify({ t: 'error', code: 'server-error', message: 'Internal error.' }),
      );
    }
  });

  ws.on('close', () => {
    alive.delete(ws);
    rooms.handleDisconnect(ws);
  });

  ws.on('error', () => {
    // 'close' will follow; swallow to avoid crashing the process.
  });
});

function routeMessage(ws: WebSocket, msg: ReturnType<typeof decodeClient>): void {
  if (!msg) return;
  switch (msg.t) {
    case 'create':
      rooms.createRoom(ws, msg.sessionToken, msg.nickname ?? null);
      break;
    case 'join': {
      const room = rooms.joinRoom(ws, msg.code.toUpperCase(), msg.sessionToken, msg.nickname ?? null);
      if (!room) {
        ws.send(
          JSON.stringify({ t: 'error', code: 'room-not-found', message: 'No room with that code.' }),
        );
      }
      break;
    }
    case 'move':
      rooms.handleMove(ws, msg.index);
      break;
    case 'rematch':
      rooms.handleRematch(ws);
      break;
    case 'leave':
      rooms.handleLeave(ws);
      break;
    case 'ping':
      rooms.handlePing(ws, msg.ts);
      break;
    default:
      break;
  }
}

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!alive.has(ws)) {
      ws.terminate();
      continue;
    }
    alive.delete(ws);
    ws.ping();
  }
}, HEARTBEAT_INTERVAL_MS);

const sweeper = setInterval(() => {
  const removed = rooms.sweep(ROOM_TTL_MS);
  if (removed > 0) console.log(`swept ${removed} idle room(s)`);
}, SWEEP_INTERVAL_MS);

httpServer.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT} (ws at ${WS_PATH})`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received, shutting down…`);
  clearInterval(heartbeat);
  clearInterval(sweeper);
  for (const ws of wss.clients) ws.close(1001, 'server shutting down');
  wss.close();
  httpServer.close(() => process.exit(0));
  // Failsafe if sockets don't drain.
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
