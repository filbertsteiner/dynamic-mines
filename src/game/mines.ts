// Pure game logic for Mines — no wallet, no React. Easy to reason about and test.
//
// The board is a 5x5 grid (25 tiles). A configurable number of tiles hide a
// bomb. You reveal tiles one at a time: each safe tile raises your multiplier.
// Cash out before you hit a bomb to bank wager * multiplier. Hit a bomb and you
// lose the wager.

export const TILE_COUNT = 25;

// Points awarded per credit wagered, at multiplier 1×. Scales raw wagers into
// satisfyingly large leaderboard numbers.
export const POINTS_PER_CREDIT = 10;

export type RoundStatus = "idle" | "playing" | "busted" | "cashed";

export interface MinesRound {
  mineCount: number;
  minePositions: Set<number>;
  revealed: Set<number>;
  status: RoundStatus;
  wager: number;
}

// Cryptographically-strong random integer in [0, max). Uses the Web Crypto API
// rather than Math.random — better practice and avoids any weak-RNG concerns.
function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

// Pick `count` distinct bomb positions out of 25 (Fisher–Yates partial shuffle).
export function pickMines(count: number): Set<number> {
  const tiles = Array.from({ length: TILE_COUNT }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + randomInt(TILE_COUNT - i);
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return new Set(tiles.slice(0, count));
}

// Fair (EV-neutral) multiplier after `safeRevealed` safe tiles with `mineCount`
// bombs. Each safe pick is progressively less likely, so the multiplier
// compounds — this is exactly the "equal upside to risk" curve: continuing is
// EV-neutral, and it accelerates as more bombs remain in fewer tiles.
export function multiplierFor(safeRevealed: number, mineCount: number): number {
  let m = 1;
  for (let i = 0; i < safeRevealed; i++) {
    m *= (TILE_COUNT - i) / (TILE_COUNT - mineCount - i);
  }
  return m;
}

export function startRound(wager: number, mineCount: number): MinesRound {
  return {
    mineCount,
    minePositions: pickMines(mineCount),
    revealed: new Set(),
    status: "playing",
    wager,
  };
}

// Leaderboard points the player banks if they cash out right now.
export function currentPoints(round: MinesRound): number {
  const mult = multiplierFor(round.revealed.size, round.mineCount);
  return Math.floor(round.wager * mult * POINTS_PER_CREDIT);
}

export function currentMultiplier(round: MinesRound): number {
  return multiplierFor(round.revealed.size, round.mineCount);
}

// Points banked if you cleared exactly `click` safe tiles with a given wager/mines.
export function pointsAtClick(
  wager: number,
  mineCount: number,
  click: number
): number {
  return Math.floor(wager * multiplierFor(click, mineCount) * POINTS_PER_CREDIT);
}

export interface ProjectedStep {
  click: number; // absolute safe-reveal count this step reaches
  points: number; // total banked if you stop here
  gain: number; // points added by this step
  minePct: number; // chance THIS click is a bomb (given you've survived so far)
}

// Look `steps` clicks ahead from the current position (or from 0 for a preview).
export function projectAhead(
  wager: number,
  mineCount: number,
  fromRevealed: number,
  steps: number
): ProjectedStep[] {
  const out: ProjectedStep[] = [];
  const maxSafe = TILE_COUNT - mineCount;
  for (let i = 1; i <= steps; i++) {
    const click = fromRevealed + i;
    if (click > maxSafe) break;
    const tilesLeft = TILE_COUNT - (click - 1);
    out.push({
      click,
      points: pointsAtClick(wager, mineCount, click),
      gain:
        pointsAtClick(wager, mineCount, click) -
        pointsAtClick(wager, mineCount, click - 1),
      minePct: mineCount / tilesLeft,
    });
  }
  return out;
}

// Risk/reward preview for the NEXT tile: how many points a safe pick adds and
// the probability the next tile is a bomb.
export function nextTilePreview(round: MinesRound): {
  nextPoints: number;
  gain: number;
  minePct: number;
  boardCleared: boolean;
} {
  const k = round.revealed.size;
  const tilesLeft = TILE_COUNT - k;
  const safeLeft = TILE_COUNT - round.mineCount - k;
  const boardCleared = safeLeft <= 0;
  const minePct = boardCleared ? 1 : round.mineCount / tilesLeft;
  const current = currentPoints(round);
  const nextPoints = boardCleared
    ? current
    : Math.floor(round.wager * multiplierFor(k + 1, round.mineCount) * POINTS_PER_CREDIT);
  return { nextPoints, gain: nextPoints - current, minePct, boardCleared };
}
