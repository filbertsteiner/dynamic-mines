// Pure logic for the "DYNAMIC" Plinko game — no React, no wallet.
//
// A puck drops through PLINKO_ROWS rows of pegs, going left/right at each row,
// and lands in one of PLINKO_SLOTS bottom slots (binomial distribution — center
// common, edges rare). The player chooses how many CENTER slots are "negative"
// (losing). Winning slots pay an EV-neutral multiplier, so rarer slots pay more
// and the whole board pays bigger as more slots turn negative.

import { POINTS_PER_CREDIT } from "./mines";

export const PLINKO_ROWS = 8;
export const PLINKO_SLOTS = PLINKO_ROWS + 1; // 9
export const NEGATIVE_OPTIONS = [1, 3, 5]; // center losing slots (odd → symmetric)

function binom(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

// Probability the puck lands in slot i (0..PLINKO_ROWS).
export function slotProbability(i: number): number {
  return binom(PLINKO_ROWS, i) / 2 ** PLINKO_ROWS;
}

// The center `negativeCount` slots are losing.
export function losingSlots(negativeCount: number): Set<number> {
  const center = Math.floor(PLINKO_SLOTS / 2);
  const half = Math.floor(negativeCount / 2);
  const set = new Set<number>();
  for (let i = center - half; i <= center + half; i++) set.add(i);
  return set;
}

// Multiplier for each slot. Losing slots = 0. Winning slots are EV-neutral:
// mult = (1 / landingProbability) / (number of winning slots), so edges pay big
// and everything scales up as more slots become negative.
export function slotMultipliers(negativeCount: number): number[] {
  const losing = losingSlots(negativeCount);
  const winning: number[] = [];
  for (let i = 0; i < PLINKO_SLOTS; i++) if (!losing.has(i)) winning.push(i);
  const mult = new Array(PLINKO_SLOTS).fill(0);
  for (const i of winning) mult[i] = 1 / slotProbability(i) / winning.length;
  return mult;
}

function randomBit(): boolean {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] & 1) === 1;
}

export interface PlinkoDrop {
  moves: boolean[]; // right? per row
  slot: number; // final slot = number of right moves
}

export function dropPuck(): PlinkoDrop {
  const moves: boolean[] = [];
  let rights = 0;
  for (let r = 0; r < PLINKO_ROWS; r++) {
    const right = randomBit();
    moves.push(right);
    if (right) rights++;
  }
  return { moves, slot: rights };
}

export function puckPoints(wager: number, mult: number): number {
  return Math.floor(wager * mult * POINTS_PER_CREDIT);
}
