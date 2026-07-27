/**
 * Pure game rules: board creation, move application (as a reducer), win/draw
 * detection, and legal-move checks. No side effects. Imported unchanged by
 * client, server, and bot.
 */

import type {
  ApplyResult,
  Board,
  GameState,
  Line,
  Mark,
  MoveRejection,
  Seat,
} from './types.ts';

export const BOARD_SIZE = 9;

/** The eight winning lines (rows, columns, diagonals) — the one bit of data
 * carried over from the previous codebase, re-expressed as a table. */
export const WINNING_LINES: readonly Line[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // columns
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

/** 'X' always moves first in a fresh game. */
export const FIRST_TURN: Mark = 'X';

export function createBoard(): Board {
  return new Array<null>(BOARD_SIZE).fill(null);
}

export function initialState(): GameState {
  return {
    board: createBoard(),
    turn: FIRST_TURN,
    status: 'playing',
    winner: null,
    winningLine: null,
    moveCount: 0,
  };
}

export function other(mark: Mark): Mark {
  return mark === 'X' ? 'O' : 'X';
}

/** The indices of all empty cells. */
export function availableMoves(board: Board): number[] {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) moves.push(i);
  }
  return moves;
}

/** Returns the winner and its line, or null if there is no winner yet. */
export function findWinner(board: Board): { mark: Mark; line: Line } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const first = board[a];
    if (first != null && first === board[b] && first === board[c]) {
      return { mark: first, line };
    }
  }
  return null;
}

export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

function statusFor(board: Board): Pick<GameState, 'status' | 'winner' | 'winningLine'> {
  const win = findWinner(board);
  if (win) return { status: 'won', winner: win.mark, winningLine: win.line };
  if (isBoardFull(board)) return { status: 'draw', winner: null, winningLine: null };
  return { status: 'playing', winner: null, winningLine: null };
}

/** Is placing at `index` legal for `seat` given the current state? */
export function isLegalMove(state: GameState, index: number, seat: Seat): boolean {
  return checkMove(state, index, seat) === null;
}

/** Returns the rejection reason, or null if the move is legal. */
export function checkMove(
  state: GameState,
  index: number,
  seat: Seat,
): MoveRejection | null {
  if (state.status !== 'playing') return 'game-over';
  if (seat !== state.turn) return 'not-your-turn';
  if (!Number.isInteger(index) || index < 0 || index >= BOARD_SIZE) return 'out-of-range';
  if (state.board[index] !== null) return 'cell-taken';
  return null;
}

/**
 * Pure reducer. Validates `seat`'s move at `index` and returns either the next
 * state or a typed rejection. The server uses the rejection to stay
 * authoritative; the client uses the same function for optimistic application.
 */
export function applyMove(state: GameState, index: number, seat: Seat): ApplyResult {
  const rejection = checkMove(state, index, seat);
  if (rejection !== null) return { ok: false, reason: rejection };

  const board = state.board.slice();
  board[index] = seat;
  const resolved = statusFor(board);

  return {
    ok: true,
    state: {
      board,
      turn: resolved.status === 'playing' ? other(seat) : state.turn,
      status: resolved.status,
      winner: resolved.winner,
      winningLine: resolved.winningLine,
      moveCount: state.moveCount + 1,
    },
  };
}
