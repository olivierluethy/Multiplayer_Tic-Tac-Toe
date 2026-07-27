/**
 * Local AI opponent. Pure and framework-free, lives in the shared module so the
 * exact same rules power it. Three difficulties:
 *
 *  - 'perfect' — full minimax with alpha-beta pruning + memoisation. Never loses.
 *  - 'normal'  — perfect, but ~20% of the time plays a random legal move.
 *  - 'easy'    — mostly random, but takes an immediate win and blocks an
 *                immediate loss when one exists.
 *
 * Move *timing* (the 300–500 ms "thinking" delay) is a UI concern and lives in
 * the client; this module only decides which cell to play.
 */

import { availableMoves, findWinner, other } from '../game/board.ts';
import type { Board, Mark } from '../game/types.ts';

export type Difficulty = 'easy' | 'normal' | 'perfect';

const NORMAL_BLUNDER_CHANCE = 0.2;

/** Serialise a board to a compact memo key. */
function keyOf(board: Board, toMove: Mark): string {
  let s = toMove;
  for (const cell of board) s += cell ?? '.';
  return s;
}

/**
 * Minimax score for `board` with `bot` as the maximising player and `toMove`
 * to act. Positive = good for the bot. Depth is folded in so the bot prefers
 * quicker wins and slower losses. Memoised across a single decision.
 */
function minimax(
  board: Board,
  toMove: Mark,
  bot: Mark,
  alpha: number,
  beta: number,
  depth: number,
  memo: Map<string, number>,
): number {
  const win = findWinner(board);
  if (win) return win.mark === bot ? 10 - depth : depth - 10;

  const moves = availableMoves(board);
  if (moves.length === 0) return 0; // draw

  const key = keyOf(board, toMove);
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const maximising = toMove === bot;
  let best = maximising ? -Infinity : Infinity;
  let a = alpha;
  let b = beta;

  for (const move of moves) {
    const next = board.slice();
    next[move] = toMove;
    const score = minimax(next, other(toMove), bot, a, b, depth + 1, memo);

    if (maximising) {
      if (score > best) best = score;
      if (best > a) a = best;
    } else {
      if (score < best) best = score;
      if (best < b) b = best;
    }
    if (b <= a) break; // prune
  }

  memo.set(key, best);
  return best;
}

/** The optimal move for `bot` given `board`. Assumes at least one legal move. */
export function bestMove(board: Board, bot: Mark): number {
  const moves = availableMoves(board);
  const memo = new Map<string, number>();
  let chosen = moves[0] ?? -1;
  let bestScore = -Infinity;

  for (const move of moves) {
    const next = board.slice();
    next[move] = bot;
    const score = minimax(next, other(bot), bot, -Infinity, Infinity, 1, memo);
    if (score > bestScore) {
      bestScore = score;
      chosen = move;
    }
  }
  return chosen;
}

/** A cell where `mark` completes a line this turn, or -1. */
function immediateWin(board: Board, mark: Mark): number {
  for (const move of availableMoves(board)) {
    const next = board.slice();
    next[move] = mark;
    if (findWinner(next)?.mark === mark) return move;
  }
  return -1;
}

/** Deterministic-free randomness: the caller passes a [0,1) value so the pure
 * function stays testable and the client controls the RNG source. */
export function chooseMove(
  board: Board,
  bot: Mark,
  difficulty: Difficulty,
  rand: () => number,
): number {
  const moves = availableMoves(board);
  if (moves.length === 0) return -1;

  const pickRandom = (): number => moves[Math.floor(rand() * moves.length)] ?? moves[0]!;

  if (difficulty === 'easy') {
    // Take a win, block a loss, otherwise wander.
    const win = immediateWin(board, bot);
    if (win !== -1) return win;
    const block = immediateWin(board, other(bot));
    if (block !== -1) return block;
    return pickRandom();
  }

  if (difficulty === 'normal' && rand() < NORMAL_BLUNDER_CHANCE) {
    return pickRandom();
  }

  return bestMove(board, bot);
}
