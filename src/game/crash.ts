// Pure logic for the Crash game — a multiplier climbs from 1.00×; cash out to
// bank wager × multiplier, but if it crashes first you lose the wager.

import { POINTS_PER_CREDIT } from "./mines";

// Multiplier grows exponentially with time: m(t) = e^(GROWTH * t). A middle pace
// — fast enough to stay exciting, slow enough to react:
// ~1.5× at ~1.1s, ~2× at ~1.8s, ~5× at ~4.2s, ~10× at ~6.1s.
export const CRASH_GROWTH = 0.38;

export function multiplierAt(elapsedMs: number): number {
  return Math.exp(CRASH_GROWTH * (elapsedMs / 1000));
}

function randomUnit(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] + 1) / 4294967297; // uniform in (0,1)
}

// Provably-fair crash point: P(crash ≥ x) = 1/x, so cashing out at ANY target is
// EV-neutral (chance 1/x × payout x = 1) — identical expected return to Mines and
// Plinko (~1× your wager). No guaranteed floor: a floor above 1× would be a
// positive-EV exploit (a guaranteed 1.5× beats every other game's 1× average).
export function sampleCrashPoint(): number {
  return 1 / randomUnit(); // > 1, median 2×, fat tail (25% ≥ 4×, 10% ≥ 10×)
}

// Chance of reaching (and being able to cash out at) a target multiplier.
export function winChance(target: number): number {
  return 1 / target;
}

export function crashPayout(wager: number, mult: number): number {
  return Math.floor(wager * mult * POINTS_PER_CREDIT);
}
