import { useEffect, useState } from "react";
import { useGame } from "./GameProvider";
import { botWeeklyScore, resetCountdown, weekRangeLabel } from "./weekly";

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

export function LeaderboardContent({ name }: { name: string }) {
  const { score, lastBank } = useGame();

  // Re-render each minute so the reset countdown ticks and today's slice grows.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const recentBank =
    lastBank && Date.now() - lastBank.at < 4000 ? lastBank : null;

  type Row = { name: string; score: number; you: boolean };
  const rows: Row[] = [
    ...BOTS.map((b) => ({ name: b.name, score: botWeeklyScore(b.name, b.rate), you: false })),
    { name, score, you: true },
  ].sort((a, b) => b.score - a.score);

  const myIndex = rows.findIndex((r) => r.you);
  const nextUp = myIndex > 0 ? rows[myIndex - 1] : null;
  const toOvertake = nextUp ? nextUp.score - score + 1 : 0;

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
        {rows.map((r, i) => (
          <li key={r.name} className={`lb-row${r.you ? " lb-you" : ""}`}>
            <span className="lb-rank">{i + 1}</span>
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
    </>
  );
}
