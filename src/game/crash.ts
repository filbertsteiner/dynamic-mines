// Pure logic for the Crash game — a multiplier climbs from 1.00×; cash out to
// bank wager × multiplier, but if it crashes first you lose the wager.

import { POINTS_PER_CREDIT } from "./mines";

// Multiplier grows exponentially with time: m(t) = e^(GROWTH * t).
// ~2× at 1.4s, ~5× at 3.2s, ~10× at 4.6s — accelerating, like a real crash game.
export const CRASH_GROWTH = 0.5;

export function multiplierAt(elapsedMs: number): number {
  return Math.exp(CRASH_GROWTH * (elapsedMs / 1000));
}

function randomUnit(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] + 1) / 4294967297; // uniform in (0,1)
}

// Provably-fair crash point: P(crash ≥ x) = 1/x, so cashing out at any target is
// EV-neutral (chance 1/x × payout x = 1). crash = 1/U with U uniform in (0,1).
export function sampleCrashPoint(): number {
  return Math.max(1, 1 / randomUnit());
}

// Chance of reaching (and being able to cash out at) a target multiplier.
export function winChance(target: number): number {
  return 1 / target;
}

export function crashPayout(wager: number, mult: number): number {
  return Math.floor(wager * mult * POINTS_PER_CREDIT);
}
