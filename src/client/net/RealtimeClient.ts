/**
 * Reconnecting WebSocket client. Exponential backoff, an outgoing queue for the
 * brief reconnect window, and application-level ping/pong every 5s feeding the
 * latency indicator. Same-origin: connects to /ws (Vite proxies it in dev).
 */

import {
  decodeServer,
  encode,
  WS_PATH,
  type ClientMsg,
  type ServerMsg,
} from '@shared/protocol/messages.ts';
import type { ConnState } from '../components/status.tsx';

const PING_INTERVAL_MS = 5_000;
const BACKOFF_BASE_MS = 500;
const BACKOFF_MAX_MS = 8_000;

export interface RealtimeHandlers {
  onMessage: (msg: ServerMsg) => void;
  onState: (state: ConnState) => void;
  onRtt: (rtt: number) => void;
  /** Called each time the socket (re)opens — the place to (re)send `join`. */
  onOpen: () => void;
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly handlers: RealtimeHandlers;
  private queue: ClientMsg[] = [];
  private attempts = 0;
  private closedByUser = false;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private lastPingTs = 0;

  constructor(handlers: RealtimeHandlers) {
    this.handlers = handlers;
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.url = `${scheme}://${window.location.host}${WS_PATH}`;
  }

  connect(): void {
    this.closedByUser = false;
    this.open();
  }

  private open(): void {
    this.handlers.onState(this.attempts === 0 ? 'connecting' : 'reconnecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      this.handlers.onState('connected');
      this.handlers.onOpen();
      this.flush();
      this.startPing();
    };

    ws.onmessage = (event) => {
      const msg = decodeServer(String(event.data));
      if (!msg) return;
      if (msg.t === 'pong') {
        this.handlers.onRtt(Math.max(0, Math.round(Date.now() - msg.ts)));
        return;
      }
      this.handlers.onMessage(msg);
    };

    ws.onclose = () => {
      this.stopPing();
      this.ws = null;
      if (this.closedByUser) {
        this.handlers.onState('disconnected');
        return;
      }
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose handles reconnection; close to be sure the handshake unwinds.
      ws.close();
    };
  }

  private scheduleReconnect(): void {
    this.handlers.onState('reconnecting');
    const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** this.attempts);
    const jitter = delay * 0.3 * Math.random();
    this.attempts++;
    this.reconnectTimer = window.setTimeout(() => this.open(), delay + jitter);
  }

  send(msg: ClientMsg): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(encode(msg));
    } else {
      this.queue.push(msg);
    }
  }

  private flush(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const pending = this.queue;
    this.queue = [];
    for (const msg of pending) this.ws.send(encode(msg));
  }

  private startPing(): void {
    this.stopPing();
    const tick = () => {
      this.lastPingTs = Date.now();
      this.send({ t: 'ping', ts: this.lastPingTs });
    };
    tick();
    this.pingTimer = window.setInterval(tick, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.stopPing();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ t: 'leave' });
    }
    this.ws?.close();
    this.ws = null;
  }
}
