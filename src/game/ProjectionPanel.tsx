import { useGame } from "./GameProvider";
import { TILE_COUNT, pointsAtClick, projectAhead } from "./mines";

const MINE_LINES: { mines: number; color: string }[] = [
  { mines: 1, color: "#67e8f9" },
  { mines: 3, color: "#a78bfa" },
  { mines: 5, color: "#f0abfc" },
];

const MAX_CLICKS = 20;

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
}

// Log-scale chart: cumulative points vs. clicks, one line per bomb count.
function Chart({ wager, mineCount }: { wager: number; mineCount: number }) {
  const series = MINE_LINES.map(({ mines, color }) => {
    const maxSafe = Math.min(MAX_CLICKS, TILE_COUNT - mines);
    const pts = Array.from({ length: maxSafe }, (_, i) =>
      pointsAtClick(wager, mines, i + 1)
    );
    return { mines, color, pts };
  });

  const all = series.flatMap((s) => s.pts);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const logMin = Math.log10(Math.max(1, min));
  const logMax = Math.log10(Math.max(10, max));

  const X0 = 46;
  const X1 = 316;
  const Y0 = 12;
  const Y1 = 126;
  const xAt = (click: number) => X0 + ((click - 1) / (MAX_CLICKS - 1)) * (X1 - X0);
  const yAt = (v: number) =>
    Y1 - ((Math.log10(Math.max(1, v)) - logMin) / (logMax - logMin)) * (Y1 - Y0);

  // 4 log-spaced y-axis ticks so the scale is legible.
  const ticks = Array.from({ length: 4 }, (_, i) => {
    const logV = logMin + (i / 3) * (logMax - logMin);
    return Math.round(Math.pow(10, logV));
  });

  return (
    <svg viewBox="0 0 324 150" width="100%" role="img" aria-label="Points per click by bomb count">
      {ticks.map((t, i) => {
        const y = yAt(t);
        return (
          <g key={i}>
            <line x1={X0} y1={y} x2={X1} y2={y} stroke="#231d33" strokeWidth="1" />
            <text x={X0 - 5} y={y + 3} fill="#a99fc4" fontSize="8" textAnchor="end">
              {fmt(t)}
            </text>
          </g>
        );
      })}
      <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke="#2c2340" strokeWidth="1" />
      <text x={(X0 + X1) / 2} y={147} fill="#a99fc4" fontSize="8" textAnchor="middle">
        clicks →
      </text>
      <text
        x={12}
        y={(Y0 + Y1) / 2}
        fill="#a99fc4"
        fontSize="8"
        textAnchor="middle"
        transform={`rotate(-90 12 ${(Y0 + Y1) / 2})`}
      >
        points
      </text>
      {series.map((s) => (
        <polyline
          key={s.mines}
          fill="none"
          stroke={s.color}
          strokeWidth={s.mines === mineCount ? 2.5 : 1.2}
          opacity={s.mines === mineCount ? 1 : 0.5}
          points={s.pts.map((v, i) => `${xAt(i + 1)},${yAt(v)}`).join(" ")}
        />
      ))}
    </svg>
  );
}

// Inner content for the "Rewards" tab (no panel wrapper — the tab provides it).
export function RewardsContent() {
  const { wager, mineCount, round } = useGame();

  if (round?.status === "playing") {
    const steps = projectAhead(wager, mineCount, round.revealed.size, 3);
    const maxSafe = TILE_COUNT - round.mineCount;
    const clearAll = pointsAtClick(round.wager, round.mineCount, maxSafe);
    return (
      <>
        <div className="ladder">
          {steps.map((s, i) => (
            <div key={s.click} className={`ladder-step${i === 0 ? " next" : ""}`}>
              <span className="ladder-when">
                {i === 0 ? "Next click" : `+${i + 1} clicks`}
              </span>
              <span className="ladder-gain ok">+{s.gain.toLocaleString()}</span>
              <span className="ladder-total">→ {s.points.toLocaleString()} pts</span>
              <span className="ladder-risk">{(s.minePct * 100).toFixed(0)}% bomb</span>
            </div>
          ))}
        </div>
        <p className="hint">
          Clear all {maxSafe} safe tiles to bank{" "}
          <strong>{clearAll.toLocaleString()} pts</strong>. Each step is
          EV-neutral — reward rises exactly as fast as risk.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="hint">
        Points at each click for a <strong>{wager}-credit</strong> wager:
      </p>
      <Chart wager={wager} mineCount={mineCount} />
      <div className="chart-legend">
        {MINE_LINES.map((l) => (
          <span key={l.mines} className={l.mines === mineCount ? "active" : ""}>
            <span className="chip-dot" style={{ background: l.color }} />
            {l.mines} {l.mines === 1 ? "bomb" : "bombs"}
          </span>
        ))}
      </div>
      <p className="hint">
        More bombs ⇒ a <strong>steeper</strong> reward curve, but each click is
        likelier to end the run. Points scale directly with your wager.
      </p>
    </>
  );
}
