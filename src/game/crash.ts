// Pure logic for the Crash game — a multiplier climbs from 1.00×; cash out to
// bank wager × multiplier, but if it crashes first you lose the wager.

import { POINTS_PER_CREDIT } from "./mines";

// Multiplier grows exponentially with time: m(t) = e^(GROWTH * t). Slow, so you
// have time to react — a gentle run-up from 1.00× that accelerates:
// ~1.5× at ~1.4s, ~2× at ~2.5s, ~5× at ~5.8s, ~10× at ~8.2s.
export const CRASH_GROWTH = 0.28;

export function multiplierAt(elapsedMs: number): number {
  return Math.exp(CRASH_GROWTH * (elapsedMs / 1000));
}

// A guaranteed minimum runway (never insta-dies below this) and a sanity cap.
export const CRASH_FLOOR = 1.5;
const CRASH_CAP = 50;

function randomUnit(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] + 1) / 4294967297; // uniform in (0,1)
}

// Crash point drawn from the fair heavy-tail (base 1/U, median ~2×), shifted up
// by the floor so it always gives an early runway before it can crash.
export function sampleCrashPoint(): number {
  const base = 1 / randomUnit(); // ≥ 1, P(base ≥ x) = 1/x
  return Math.min(CRASH_CAP, CRASH_FLOOR + (base - 1));
}

// Chance of reaching (and being able to cash out at) a target multiplier.
export function winChance(target: number): number {
  return 1 / target;
}

export function crashPayout(wager: number, mult: number): number {
  return Math.floor(wager * mult * POINTS_PER_CREDIT);
}
