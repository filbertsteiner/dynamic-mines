import { useMemo, useRef, useState } from "react";
import { useGame } from "./GameProvider";
import {
  PLINKO_ROWS,
  PLINKO_SLOTS,
  NEGATIVE_OPTIONS,
  slotMultipliers,
  losingSlots,
  dropPuck,
  puckPoints,
} from "./plinko";
import { useDevLog } from "../dev/DevLog";

const SLOTW = 100 / PLINKO_SLOTS; // slot width in %
const STEP_MS = 110;

export function PlinkoBoard() {
  const { credits, wager, setWager, spendCredits, bankPoints } = useGame();
  const { log } = useDevLog();
  const [negativeCount, setNegativeCount] = useState(3);
  const [wagerText, setWagerText] = useState(String(wager));
  const [puck, setPuck] = useState<{ x: number; y: number } | null>(null);
  const [dropping, setDropping] = useState(false);
  const [result, setResult] = useState<{ slot: number; points: number; win: boolean } | null>(null);
  const timers = useRef<number[]>([]);

  const mult = useMemo(() => slotMultipliers(negativeCount), [negativeCount]);
  const losing = useMemo(() => losingSlots(negativeCount), [negativeCount]);
  const canPlay = wager > 0 && wager <= credits && !dropping;

  const slotX = (pos: number) => (pos + 0.5) * SLOTW; // % center for a slot-position

  function drop() {
    if (!canPlay || !spendCredits(wager)) return;
    setResult(null);
    setDropping(true);
    log({
      category: "game",
      onChain: false,
      title: `Plinko drop · ${wager} credits · ${negativeCount} negatives`,
      detail: "Local game — wager spent (settles on-chain as revenue).",
    });

    const { moves, slot } = dropPuck();

    // Puck position at each row (zigzag ±0.5 slot per row), then into the slot.
    const path: { x: number; y: number }[] = [];
    let rights = 0;
    for (let k = 0; k <= PLINKO_ROWS; k++) {
      const pos = rights + (PLINKO_ROWS - k) / 2;
      path.push({ x: slotX(pos), y: 3 + (k / PLINKO_ROWS) * 68 });
      if (k < PLINKO_ROWS && moves[k]) rights++;
    }

    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPuck(path[0]);
    path.forEach((p, i) =>
      timers.current.push(window.setTimeout(() => setPuck(p), i * STEP_MS))
    );

    const landMs = PLINKO_ROWS * STEP_MS + 120;
    timers.current.push(
      window.setTimeout(() => setPuck({ x: slotX(slot), y: 84 }), landMs)
    );
    timers.current.push(
      window.setTimeout(() => {
        const m = mult[slot];
        const win = m > 0;
        const points = win ? puckPoints(wager, m) : 0;
        if (win) bankPoints(points);
        setResult({ slot, points, win });
        setDropping(false);
        log({
          category: "game",
          onChain: false,
          title: win
            ? `Plinko: +${points.toLocaleString()} pts (slot ×${m.toFixed(1)})`
            : "Plinko: negative slot — no points",
        });
      }, landMs + 200)
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

  return (
    <div className="panel">
      <div className="row">
        <p className="panel-title">DYNAMIC</p>
        <span className="label">drop the puck</span>
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
        <button onClick={drop} disabled={!canPlay}>
          {credits <= 0 ? "Deposit to play" : `Drop for ${wager}`}
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
        {pegs.map((p) => (
          <span key={p.key} className="peg" style={{ left: `${p.x}%`, top: `${p.y}%` }} />
        ))}
        {puck && (
          <span className="puck" style={{ left: `${puck.x}%`, top: `${puck.y}%` }} />
        )}
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
        More negative slots ⇒ bigger multipliers on the winners. Each drop spends
        your wager (recognized on-chain as revenue); wins bank leaderboard points.
      </p>
    </div>
  );
}
