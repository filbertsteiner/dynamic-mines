import { useEffect, useState } from "react";
import { useGame } from "./GameProvider";
import { botWeeklyScore, resetCountdown, weekRangeLabel } from "./weekly";
import {
  remoteLeaderboardEnabled,
  fetchTopScores,
  submitScore,
  type RemoteScore,
} from "./leaderboardStore";

// Seeded "degen" bots. Each has a daily earning rate; their board total is the
// sum over the rolling 7-day window (see weekly.ts), so standings drift day to
// day. Rates are tuned so weekly totals land in a lively 100–21k range.
const BOTS: { name: string; rate: number }[] = [
  { name: "vitalik.base", rate: 3000 },
  { name: "WhaleAlert", rate: 1400 },
  { name: "DiamondHodler", rate: 600 },
  { name: "0xDegen", rate: 260 },
  { name: "gm_frens", rate: 90 },
  { name: "PaperHandsPete", rate: 18 },
];

// Privacy-safe public handle from a wallet address (never show others' emails).
function handleFor(address: string): string {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "player";
}

type Row = { name: string; score: number; you: boolean; rank: number };

export function LeaderboardContent({ name, address }: { name: string; address: string }) {
  const { score, lastBank } = useGame();
  const [remote, setRemote] = useState<RemoteScore[]>([]);

  // Re-render each minute so the reset countdown ticks and today's slice grows.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Live-poll the shared board (if configured) so other players appear/move.
  useEffect(() => {
    if (!remoteLeaderboardEnabled) return;
    let active = true;
    const load = () => fetchTopScores().then((r) => active && setRemote(r));
    load();
    const id = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Push my score to the shared board, debounced so rapid banks coalesce.
  useEffect(() => {
    if (!remoteLeaderboardEnabled || score <= 0) return;
    const id = setTimeout(() => submitScore(address, handleFor(address), score), 1500);
    return () => clearTimeout(id);
  }, [score, address]);

  const recentBank = lastBank && Date.now() - lastBank.at < 4000 ? lastBank : null;

  const meLc = address.toLowerCase();
  const remoteRows: Omit<Row, "rank">[] = remote
    .filter((r) => r.address.toLowerCase() !== meLc)
    .map((r) => ({ name: r.name, score: r.score, you: false }));

  const all: Omit<Row, "rank">[] = [
    ...BOTS.map((b) => ({ name: b.name, score: botWeeklyScore(b.name, b.rate), you: false })),
    ...remoteRows,
    { name, score, you: true },
  ].sort((a, b) => b.score - a.score);

  const myRank = all.findIndex((r) => r.you);
  const nextUp = myRank > 0 ? all[myRank - 1] : null;
  const toOvertake = nextUp ? nextUp.score - score + 1 : 0;

  // Show the top 12; if I'm below that, append my own row so I'm always visible.
  const rows: Row[] = all.slice(0, 12).map((r, i) => ({ ...r, rank: i + 1 }));
  if (myRank >= 12) rows.push({ ...all[myRank], rank: myRank + 1 });

  return (
    <>
      <div className="lb-head">
        <div>
          <span className="lb-title">This week</span>
          <span className="lb-range">{weekRangeLabel()}</span>
        </div>
        <span className="lb-reset" title="The 7-day window rolls forward at UTC midnight">
          resets in {resetCountdown()}
        </span>
      </div>

      <ol className="lb">
        {rows.map((r) => (
          <li key={`${r.rank}-${r.name}`} className={`lb-row${r.you ? " lb-you" : ""}`}>
            <span className="lb-rank">{r.rank}</span>
            <span className="lb-name">{r.you ? `${r.name} (you)` : r.name}</span>
            <span className="lb-score">
              {r.score.toLocaleString()}
              {r.you && recentBank && (
                <span key={recentBank.at} className="lb-gain">
                  +{recentBank.gain.toLocaleString()}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {nextUp ? (
        <p className="hint">
          <strong>{toOvertake.toLocaleString()}</strong> pts to overtake{" "}
          <strong>{nextUp.name}</strong> this week 🔥
        </p>
      ) : (
        <p className="hint ok">👑 Top of the weekly board — keep it up!</p>
      )}
      {remoteLeaderboardEnabled && (
        <p className="hint">🌐 Live global board — real players compete in real time.</p>
      )}
    </>
  );
}
