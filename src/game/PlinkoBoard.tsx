import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "./GameProvider";
import {
  PLINKO_ROWS,
  PLINKO_SLOTS,
  NEGATIVE_OPTIONS,
  slotMultipliers,
  randomLosingSlots,
  simulateDrop,
  puckPoints,
} from "./plinko";
import { GameShell } from "./GameShell";
import { useDevLog } from "../dev/DevLog";

const SLOTW = 100 / PLINKO_SLOTS;
const STEP_MS = 145;
const CENTER = (PLINKO_SLOTS - 1) / 2;
const slotX = (pos: number) => (pos + 0.5) * SLOTW;

type Phase = "idle" | "aiming" | "dropping" | "landed";

export function PlinkoBoard() {
  const {
    credits,
    wager,
    negativeCount,
    setNegativeCount,
    spendCredits,
    bankPoints,
  } = useGame();
  const { log } = useDevLog();

  const [phase, setPhase] = useState<Phase>("idle");
  const [losing, setLosing] = useState<Set<number>>(new Set());
  const [topPos, setTopPos] = useState(CENTER);
  const [fallPos, setFallPos] = useState({ x: slotX(CENTER), y: 3 });
  const [result, setResult] = useState<{ slot: number; points: number; win: boolean } | null>(null);
  const timers = useRef<number[]>([]);

  const mult = useMemo(() => slotMultipliers(losing), [losing]);
  const revealed = phase === "dropping" || phase === "landed";
  const canPlay = wager > 0 && wager <= credits;
  const busy = phase === "aiming" || phase === "dropping";

  // Oscillate the puck left↔right at the top while aiming.
  useEffect(() => {
    if (phase !== "aiming") return;
    let raf = 0;
    const start = performance.now();
    const amp = CENTER - 0.3;
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      setTopPos(CENTER + amp * Math.sin((t * (2 * Math.PI)) / 1.8));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // "Play" — start a fresh round: hide the values, puck appears and oscillates.
  function play() {
    if (!canPlay) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setResult(null);
    setLosing(new Set()); // hidden — tiles show "?"
    setPhase("aiming");
  }

  // Reset to a fresh, empty board (removes the landed puck + revealed tiles).
  function clear() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setResult(null);
    setLosing(new Set());
    setPhase("idle");
  }

  // "Drop" — release the puck; the values are randomly assigned NOW so you can't
  // aim for a known slot.
  function drop() {
    if (phase !== "aiming") return;
    if (!spendCredits(wager)) return;
    const newLosing = randomLosingSlots(negativeCount);
    const newMult = slotMultipliers(newLosing);
    setLosing(newLosing);
    const releasePos = topPos;
    setPhase("dropping");
    setFallPos({ x: slotX(releasePos), y: 3 });
    log({
      category: "game",
      onChain: false,
      title: `Plinko drop · ${wager} credits · ${negativeCount} negatives`,
      detail: "Local game — wager spent (settles on-chain as revenue).",
    });

    const { positions, slot } = simulateDrop(releasePos);
    positions.forEach((pos, k) => {
      const y = 3 + (k / PLINKO_ROWS) * 68;
      timers.current.push(
        window.setTimeout(() => setFallPos({ x: slotX(pos), y }), k * STEP_MS)
      );
    });

    const landMs = (positions.length + 0.5) * STEP_MS;
    timers.current.push(
      window.setTimeout(() => setFallPos({ x: slotX(slot), y: 84 }), landMs)
    );
    timers.current.push(
      window.setTimeout(() => {
        const m = newMult[slot];
        const win = m > 0;
        const points = win ? puckPoints(wager, m) : 0;
        if (win) bankPoints(points);
        setResult({ slot, points, win });
        setPhase("landed");
        log({
          category: "game",
          onChain: false,
          title: win
            ? `Plinko: +${points.toLocaleString()} pts (slot ×${m.toFixed(1)})`
            : "Plinko: negative slot — no points",
        });
      }, landMs + 230)
    );
  }

  const pegs: { x: number; y: number; key: string }[] = [];
  for (let r = 0; r < PLINKO_ROWS; r++) {
    const y = 6 + ((r + 0.5) / PLINKO_ROWS) * 66;
    for (let c = 0; c < PLINKO_SLOTS; c++) {
      const x = (c + (r % 2) * 0.5 + 0.25) * SLOTW;
      if (x > 3 && x < 97) pegs.push({ x, y, key: `${r}-${c}` });
    }
  }

  const showPuck = phase !== "idle";
  const puckPos = phase === "aiming" ? { x: slotX(topPos), y: 3 } : fallPos;

  const status = result ? (
    <strong className={`result-tag ${result.win ? "ok" : "err"}`}>
      {result.win ? `✅ +${result.points.toLocaleString()} pts` : "💥 No points"}
    </strong>
  ) : (
    <span className="label">time your drop</span>
  );

  const options = (
    <label>
      Negatives
      <select
        value={negativeCount}
        disabled={busy}
        onChange={(e) => setNegativeCount(Number(e.target.value))}
      >
        {NEGATIVE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );

  const actions =
    phase === "aiming" ? (
      <button className="cashout" onClick={drop}>
        Drop
      </button>
    ) : phase === "dropping" ? (
      <button className="cashout" disabled>
        Dropping…
      </button>
    ) : phase === "landed" ? (
      <>
        <button className="play-btn" onClick={play} disabled={!canPlay}>
          Play again
        </button>
        <button className="secondary" onClick={clear}>
          Clear
        </button>
      </>
    ) : (
      <button className="play-btn" onClick={play} disabled={!canPlay}>
        {credits <= 0 ? "Deposit to play" : `Bet ${wager}`}
      </button>
    );

  const hint = (
    <>
      Values are hidden until you drop, and reshuffle each round. Each wager
      settles on-chain as revenue; wins bank leaderboard points.
    </>
  );

  return (
    <GameShell title="Plinko" status={status} options={options} actions={actions} wagerDisabled={busy} hint={hint}>
      <div className="plinko">
        <div className="plinko-brand">DYNAMIC</div>
        {pegs.map((p) => (
          <span key={p.key} className="peg" style={{ left: `${p.x}%`, top: `${p.y}%` }} />
        ))}
        {showPuck && (
          <span
            className={`puck${phase === "dropping" ? " falling" : ""}`}
            style={{ left: `${puckPos.x}%`, top: `${puckPos.y}%` }}
          />
        )}
        <div className="slots">
          {Array.from({ length: PLINKO_SLOTS }, (_, i) => {
            if (!revealed)
              return (
                <div key={i} className="pslot pslot-unknown">
                  ?
                </div>
              );
            const neg = losing.has(i);
            return (
              <div
                key={i}
                className={`pslot ${neg ? "pslot-neg" : "pslot-pos"} ${
                  result && result.slot === i ? "pslot-hit" : ""
                }`}
              >
                {neg ? "✕" : `${mult[i].toFixed(mult[i] < 10 ? 1 : 0)}×`}
              </div>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
