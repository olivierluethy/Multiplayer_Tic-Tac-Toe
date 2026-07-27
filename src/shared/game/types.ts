/**
 * Core game types. Pure data — no DOM, no framework. Shared verbatim by the
 * client, the server, and the bot. This is the single source of truth for the
 * rules (audit lesson #1).
 */

/** A player's mark. Players are also seated by their mark. */
export type Mark = 'X' | 'O';

/** A board cell: a mark, or empty. */
export type Cell = Mark | null;

/** The seat a client occupies. 'X' moves first in every fresh game. */
export type Seat = Mark;

/** A 0..8 board index, row-major (0,1,2 top row; 8 bottom-right). */
export type CellIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** The board: exactly 9 cells, row-major. */
export type Board = readonly Cell[];

/** A winning line as its three board indices. */
export type Line = readonly [number, number, number];

export type GameStatus = 'playing' | 'won' | 'draw';

/** Immutable game state. Every mutation returns a fresh object. */
export interface GameState {
  readonly board: Board;
  /** Whose turn it is (only meaningful while status === 'playing'). */
  readonly turn: Mark;
  readonly status: GameStatus;
  /** The winning mark, when status === 'won'. */
  readonly winner: Mark | null;
  /** The three cells forming the win, when status === 'won'. */
  readonly winningLine: Line | null;
  /** Count of moves played — also the seat that lost the turn parity, handy for UIs. */
  readonly moveCount: number;
}

export type MoveRejection =
  | 'out-of-range'
  | 'cell-taken'
  | 'not-your-turn'
  | 'game-over';

export type ApplyResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly reason: MoveRejection };
