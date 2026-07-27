/**
 * Client identity, persisted client-side only (no accounts, no server storage).
 * The session token lives in sessionStorage so a reload keeps the seat within
 * the reconnect window; the nickname is an optional convenience in localStorage.
 */

const TOKEN_KEY = 'ttt.sessionToken';
const NICK_KEY = 'ttt.nickname';

function randomToken(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getSessionToken(): string {
  let token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = randomToken();
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function getNickname(): string {
  return localStorage.getItem(NICK_KEY) ?? '';
}

export function setNickname(name: string): void {
  const trimmed = name.trim().slice(0, 20);
  if (trimmed) localStorage.setItem(NICK_KEY, trimmed);
  else localStorage.removeItem(NICK_KEY);
}
