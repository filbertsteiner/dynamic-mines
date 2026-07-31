// Optional SHARED leaderboard backed by Supabase's auto-generated REST API
// (PostgREST). Deliberately dependency-free — just `fetch` — so it needs no npm
// package and works with our prebuilt deploy. The URL and anon key are PUBLIC
// values (safe to ship in the bundle, exactly like the Dynamic environment ID);
// they are read from env vars, never hardcoded. Real protection is the table's
// row-level-security policy. If the env vars are absent, everything below no-ops
// and the leaderboard falls back to the local bots-only board.
//
// Setup steps + SQL are in SUPABASE_SETUP.md.

const BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const remoteLeaderboardEnabled = Boolean(BASE && ANON);

export interface RemoteScore {
  address: string;
  name: string;
  score: number;
  updated_at: string;
}

function headers(): Record<string, string> {
  return {
    apikey: ANON as string,
    Authorization: `Bearer ${ANON as string}`,
    "Content-Type": "application/json",
  };
}

// Top scores that were active within the rolling 7-day window.
export async function fetchTopScores(limit = 25): Promise<RemoteScore[]> {
  if (!remoteLeaderboardEnabled) return [];
  const since = encodeURIComponent(new Date(Date.now() - 7 * 86_400_000).toISOString());
  const url =
    `${BASE}/rest/v1/scores` +
    `?select=address,name,score,updated_at&updated_at=gte.${since}` +
    `&order=score.desc&limit=${limit}`;
  try {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return [];
    return (await res.json()) as RemoteScore[];
  } catch {
    return [];
  }
}

// Upsert this player's score, keyed by wallet address. Best-effort; failures are
// swallowed so a flaky network never disrupts play.
export async function submitScore(
  address: string,
  name: string,
  score: number
): Promise<void> {
  if (!remoteLeaderboardEnabled || score <= 0) return;
  try {
    await fetch(`${BASE}/rest/v1/scores?on_conflict=address`, {
      method: "POST",
      headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        address: address.toLowerCase(),
        name,
        score,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch {
    /* best-effort */
  }
}
