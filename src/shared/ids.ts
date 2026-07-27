/**
 * Identifier conventions shared by client and server. Real, collision-resistant
 * ids — never sums of Math.random() (audit failure #5).
 */

/** Uppercase, ambiguous glyphs removed: no O/0, no I/1. 32 symbols. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 4;

/** True if `code` is a well-formed room code (after uppercasing). */
export function isValidRoomCode(code: string): boolean {
  const c = code.toUpperCase();
  if (c.length !== ROOM_CODE_LENGTH) return false;
  for (const ch of c) {
    if (!ROOM_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/** Build a room code from a source of random bytes (one byte per char). */
export function roomCodeFromBytes(bytes: Uint8Array): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const byte = bytes[i] ?? 0;
    code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
  }
  return code;
}
