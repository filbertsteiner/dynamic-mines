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

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}
function randomBit(): boolean {
  return (randomInt(2) & 1) === 1;
}

// Randomly place `negativeCount` losing slots anywhere on the board (not just
// the center) — so the value layout is different every drop.
export function randomLosingSlots(negativeCount: number): Set<number> {
  const idx = Array.from({ length: PLINKO_SLOTS }, (_, i) => i);
  for (let i = 0; i < negativeCount; i++) {
    const j = i + randomInt(PLINKO_SLOTS - i);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return new Set(idx.slice(0, negativeCount));
}

// Multiplier for each slot given the current losing layout. Losing slots = 0.
// Winning slots are EV-neutral: mult = (1 / landingProbability) / (winning
// count), so rare slots pay big and everything scales up as more turn negative.
export function slotMultipliers(losing: Set<number>): number[] {
  const winning: number[] = [];
  for (let i = 0; i < PLINKO_SLOTS; i++) if (!losing.has(i)) winning.push(i);
  const mult = new Array(PLINKO_SLOTS).fill(0);
  for (const i of winning) mult[i] = 1 / slotProbability(i) / winning.length;
  return mult;
}

// A puck released at continuous position `startPos`. Fair Galton-board physics:
// the LANDING slot follows the true binomial distribution independent of where
// you release, so no drop position can be exploited (dropping at an edge does
// NOT raise your odds of the rare, high-paying corners). The release point only
// sets where the visual bounce begins. Returns the path and the final slot.
export function simulateDrop(startPos: number): {
  positions: number[];
  slot: number;
} {
  // Fair binomial landing: 8 independent left/right bounces.
  let slot = 0;
  for (let r = 0; r < PLINKO_ROWS; r++) if (randomBit()) slot++;

  // Build a believable bounce path from the release point down to that slot.
  const start = Math.max(0, Math.min(PLINKO_SLOTS - 1, startPos));
  const positions: number[] = [start];
  let pos = start;
  for (let r = 1; r <= PLINKO_ROWS; r++) {
    const target = start + (slot - start) * (r / PLINKO_ROWS);
    pos = Math.max(0, Math.min(PLINKO_SLOTS - 1, target + (Math.random() - 0.5) * 0.9));
    positions.push(pos);
  }
  positions[positions.length - 1] = slot; // land exactly in the fair slot
  return { positions, slot };
}

export function puckPoints(wager: number, mult: number): number {
  return Math.floor(wager * mult * POINTS_PER_CREDIT);
}
