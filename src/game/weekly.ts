// Rolling 7-day leaderboard model for the demo. There's no backend, so the rival
// "players" are bots whose scores are generated deterministically PER DAY. The
// board always covers the last 7 UTC days (6 past + today); at each UTC midnight
// the oldest day drops off and a fresh day begins, so standings shift over time
// and a returning player sees real movement — someone overtook someone.

const DAY_MS = 86_400_000;

export function utcDayIndex(ms = Date.now()): number {
  return Math.floor(ms / DAY_MS);
}

// Fraction of the current UTC day elapsed (0..1) — today's slice fills through
// the day and resets at midnight.
export function dayFraction(ms = Date.now()): number {
  return (ms % DAY_MS) / DAY_MS;
}

export function msUntilReset(ms = Date.now()): number {
  return DAY_MS - (ms % DAY_MS);
}

export function resetCountdown(ms = Date.now()): string {
  const left = msUntilReset(ms);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Deterministic pseudo-random in [0,1) from a string + day (small string hash
// → mulberry32). Stable within a day, varies across days.
function seeded(name: string, day: number): number {
  let h = 2166136261 ^ day;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  }
  h = Math.imul(h ^ (h >>> 15), 1 | h);
  h ^= h + Math.imul(h ^ (h >>> 7), 61 | h);
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
}

// A bot's total over the rolling 7-day window. Each past day contributes
// dailyRate × (0.5..1.5); today is scaled by how much of the day has elapsed.
export function botWeeklyScore(
  name: string,
  dailyRate: number,
  day = utcDayIndex(),
  frac = dayFraction()
): number {
  let total = 0;
  for (let d = day - 6; d <= day; d++) {
    const amount = dailyRate * (0.5 + seeded(name, d));
    total += d === day ? amount * frac : amount;
  }
  return Math.round(total);
}

// The rolling window's date range, e.g. "Jul 24 – 30".
export function weekRangeLabel(day = utcDayIndex()): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  const start = new Date((day - 6) * DAY_MS).toLocaleDateString("en-US", opts);
  const end = new Date(day * DAY_MS).toLocaleDateString("en-US", {
    day: "numeric",
    timeZone: "UTC",
  });
  return `${start} – ${end}`;
}
