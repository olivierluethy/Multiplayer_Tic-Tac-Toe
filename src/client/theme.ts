import type { CSSProperties } from 'react';
import type { Mark } from '@shared/game/types.ts';

/** CSS custom properties that retint turn-aware chrome to the given mark. */
export function seatVars(mark: Mark): CSSProperties {
  return {
    ['--turn' as string]: mark === 'X' ? 'var(--x)' : 'var(--o)',
    ['--turn-dim' as string]: mark === 'X' ? 'var(--x-dim)' : 'var(--o-dim)',
  } as CSSProperties;
}

export function markColor(mark: Mark): string {
  return mark === 'X' ? 'var(--x)' : 'var(--o)';
}
