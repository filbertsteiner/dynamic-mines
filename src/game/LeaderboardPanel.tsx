import { useGame } from "./GameProvider";

// Seeded "degen" bots so the board never looks empty and there's always
// someone just ahead to chase. Spaced so early cash-outs climb quickly.
const BOTS: { name: string; score: number }[] = [
  { name: "vitalik.base", score: 21000 },
  { name: "WhaleAlert", score: 9800 },
  { name: "DiamondHodler", score: 4200 },
  { name: "0xDegen", score: 1850 },
  { name: "gm_frens", score: 640 },
  { name: "PaperHandsPete", score: 120 },
];

export function LeaderboardContent({ name }: { name: string }) {
  const { score, lastBank } = useGame();

  const recentBank =
    lastBank && Date.now() - lastBank.at < 4000 ? lastBank : null;

  type Row = { name: string; score: number; you: boolean };
  const rows: Row[] = [
    ...BOTS.map((b) => ({ ...b, you: false })),
    { name, score, you: true },
  ].sort((a, b) => b.score - a.score);

  const myIndex = rows.findIndex((r) => r.you);
  const nextUp = myIndex > 0 ? rows[myIndex - 1] : null;
  const toOvertake = nextUp ? nextUp.score - score + 1 : 0;

  return (
    <>
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
          <strong>{nextUp.name}</strong> 🔥
        </p>
      ) : (
        <p className="hint ok">👑 You're on top of the board!</p>
      )}
    </>
  );
}
