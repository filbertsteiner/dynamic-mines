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
import { useDevLog } from "../dev/DevLog";

const SLOTW = 100 / PLINKO_SLOTS; // slot width in %
const STEP_MS = 145; // per-row fall time (slower = nicer to watch)
const CENTER = (PLINKO_SLOTS - 1) / 2;
const slotX = (pos: number) => (pos + 0.5) * SLOTW; // % center for a position

export function PlinkoBoard() {
  const {
    credits,
    wager,
    setWager,
    negativeCount,
    setNegativeCount,
    spendCredits,
    bankPoints,
  } = useGame();
  const { log } = useDevLog();

  const [wagerText, setWagerText] = useState(String(wager));
  const [losing, setLosing] = useState(() => randomLosingSlots(negativeCount));
  const [topPos, setTopPos] = useState(CENTER); // oscillating aim position
  const [fallPos, setFallPos] = useState({ x: slotX(CENTER), y: 3 });
  const [dropping, setDropping] = useState(false);
  const [result, setResult] = useState<{ slot: number; points: number; win: boolean } | null>(null);
  const timers = useRef<number[]>([]);

  const mult = useMemo(() => slotMultipliers(losing), [losing]);
  const canPlay = wager > 0 && wager <= credits && !dropping;

  // New random layout when the negative count changes.
  useEffect(() => setLosing(randomLosingSlots(negativeCount)), [negativeCount]);

  // Oscillate the puck left↔right at the top while not dropping, so the player
  // aims and releases with timing.
  useEffect(() => {
    if (dropping) return;
    let raf = 0;
    const start = performance.now();
    const amp = CENTER - 0.3;
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      setTopPos(CENTER + amp * Math.sin(t * (2 * Math.PI) / 1.8));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [dropping]);

  function drop() {
    if (!canPlay || !spendCredits(wager)) return;
    setResult(null);
    const releasePos = topPos;
    setDropping(true);
    setFallPos({ x: slotX(releasePos), y: 3 });
    log({
      category: "game",
      onChain: false,
      title: `Plinko drop · ${wager} credits · ${negativeCount} negatives`,
      detail: "Local game — wager spent (settles on-chain as revenue).",
    });

    const { positions, slot } = simulateDrop(releasePos);
    timers.current.forEach(clearTimeout);
    timers.current = [];
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
        const m = mult[slot];
        const win = m > 0;
        const points = win ? puckPoints(wager, m) : 0;
        if (win) bankPoints(points);
        setResult({ slot, points, win });
        setDropping(false);
        setLosing(randomLosingSlots(negativeCount)); // reshuffle for next drop
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

  // Decorative staggered peg field.
  const pegs: { x: number; y: number; key: string }[] = [];
  for (let r = 0; r < PLINKO_ROWS; r++) {
    const y = 6 + ((r + 0.5) / PLINKO_ROWS) * 66;
    for (let c = 0; c < PLINKO_SLOTS; c++) {
      const x = (c + (r % 2) * 0.5 + 0.25) * SLOTW;
      if (x > 3 && x < 97) pegs.push({ x, y, key: `${r}-${c}` });
    }
  }

  const puckPos = dropping ? fallPos : { x: slotX(topPos), y: 3 };

  return (
    <div className="panel">
      <div className="row">
        <p className="panel-title">Plinko</p>
        <span className="label">time your drop</span>
      </div>

      <div className="setup">
        <label>
          Wager
          <input
            type="number"
            min={1}
            max={credits}
            value={wagerText}
            onChange={(e) => {
              setWagerText(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) setWager(n);
            }}
            onBlur={() => setWagerText(String(wager))}
          />
        </label>
        <label>
          Negatives
          <select
            value={negativeCount}
            onChange={(e) => setNegativeCount(Number(e.target.value))}
          >
            {NEGATIVE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button className="cashout" onClick={drop} disabled={!canPlay}>
          {credits <= 0 ? "Deposit to play" : `Drop · ${wager}`}
        </button>
      </div>

      {result && (
        <div className="status">
          {result.win ? (
            <span className="ok">✅ Banked {result.points.toLocaleString()} points!</span>
          ) : (
            <span className="err">💥 Negative slot — no points this drop.</span>
          )}
        </div>
      )}

      <div className="plinko">
        <div className="plinko-brand">DYNAMIC</div>
        {pegs.map((p) => (
          <span key={p.key} className="peg" style={{ left: `${p.x}%`, top: `${p.y}%` }} />
        ))}
        <span
          className={`puck${dropping ? " falling" : ""}`}
          style={{ left: `${puckPos.x}%`, top: `${puckPos.y}%` }}
        />
        <div className="slots">
          {mult.map((m, i) => (
            <div
              key={i}
              className={`pslot ${losing.has(i) ? "pslot-neg" : "pslot-pos"} ${
                result && result.slot === i ? "pslot-hit" : ""
              }`}
            >
              {losing.has(i) ? "✕" : `${m.toFixed(m < 10 ? 1 : 0)}×`}
            </div>
          ))}
        </div>
      </div>

      <p className="hint">
        The value slots reshuffle every drop. More negatives ⇒ bigger multipliers
        on the winners. Each drop spends your wager (recognized on-chain as
        revenue); wins bank leaderboard points.
      </p>
    </div>
  );
}
