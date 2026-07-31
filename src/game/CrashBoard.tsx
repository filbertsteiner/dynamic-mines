import { useEffect, useRef, useState } from "react";
import { useGame } from "./GameProvider";
import { multiplierAt, sampleCrashPoint, crashPayout } from "./crash";
import { GameShell } from "./GameShell";
import { useDevLog } from "../dev/DevLog";

type Phase = "idle" | "flying" | "ended";
type Result = { cashedAt?: number; crashedAt: number; win: boolean; points: number };

export function CrashBoard() {
  const { credits, wager, spendCredits, bankPoints } = useGame();
  const { log } = useDevLog();

  const [phase, setPhase] = useState<Phase>("idle");
  const [mult, setMult] = useState(1);
  const [sceneY, setSceneY] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const crashRef = useRef(0);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const sceneRef = useRef(0);
  const wagerRef = useRef(wager);

  const canPlay = wager > 0 && wager <= credits;

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function play() {
    if (!canPlay || !spendCredits(wager)) return;
    crashRef.current = sampleCrashPoint();
    wagerRef.current = wager;
    startRef.current = performance.now();
    sceneRef.current = 0;
    setSceneY(0);
    setResult(null);
    setMult(1);
    setPhase("flying");
    log({
      category: "game",
      onChain: false,
      title: `Crash bet · ${wager} credits`,
      detail: "Local game — wager spent (settles on-chain as revenue).",
    });

    const loop = (now: number) => {
      const m = multiplierAt(now - startRef.current);
      if (m >= crashRef.current) {
        setMult(crashRef.current);
        setResult({ crashedAt: crashRef.current, win: false, points: 0 });
        setPhase("ended");
        log({
          category: "game",
          onChain: false,
          title: `Crash @ ${crashRef.current.toFixed(2)}× — busted`,
        });
        return;
      }
      setMult(m);
      // Scroll the starfield to fake continued ascent — faster as it climbs.
      sceneRef.current += 3 + Math.min(m, 25) * 0.7;
      setSceneY(sceneRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  function cashOut() {
    if (phase !== "flying") return;
    cancelAnimationFrame(rafRef.current);
    const m = Math.min(
      multiplierAt(performance.now() - startRef.current),
      crashRef.current
    );
    const points = crashPayout(wagerRef.current, m);
    bankPoints(points);
    setMult(m);
    setResult({ cashedAt: m, crashedAt: crashRef.current, win: true, points });
    setPhase("ended");
    log({
      category: "game",
      onChain: false,
      title: `Crash: cashed @ ${m.toFixed(2)}× → +${points.toLocaleString()} pts`,
    });
  }

  function clear() {
    cancelAnimationFrame(rafRef.current);
    setResult(null);
    setMult(1);
    setPhase("idle");
  }

  const flying = phase === "flying";
  const crashed = phase === "ended" && result !== null && !result.win;
  const cashed = phase === "ended" && result !== null && result.win;

  // The rocket climbs to a "cruising" spot (by ~6×) and then holds there — the
  // scrolling starfield conveys further ascent, so it never runs out of room.
  const climb = Math.min(1, Math.log(Math.max(1, mult)) / Math.log(6));
  const rocketX = 12 + climb * 46;
  const rocketY = 80 - climb * 50;

  const status = result ? (
    <strong className={`result-tag ${result.win ? "ok" : "err"}`}>
      {result.win
        ? `✅ +${result.points.toLocaleString()} pts`
        : `💥 Crashed @ ${result.crashedAt.toFixed(2)}×`}
    </strong>
  ) : (
    <span className="label">cash out before it crashes</span>
  );

  const actions = flying ? (
    <button className="cashout" onClick={cashOut}>
      Cash out {mult.toFixed(2)}×
    </button>
  ) : phase === "ended" ? (
    <>
      <button className="secondary" onClick={clear}>
        Clear
      </button>
      <button className="play-btn" onClick={play} disabled={!canPlay}>
        Play again
      </button>
    </>
  ) : (
    <button className="play-btn" onClick={play} disabled={!canPlay}>
      {credits <= 0 ? "Deposit to play" : `Bet ${wager}`}
    </button>
  );

  const hint = (
    <>
      The multiplier climbs from 1.00×. Cash out to bank wager × multiplier in
      points — but if it crashes first, you lose the wager. Each bet settles
      on-chain as revenue.
    </>
  );

  return (
    <GameShell title="Crash" status={status} actions={actions} wagerDisabled={flying} hint={hint}>
      <div
        className={`crash${flying ? " is-flying" : ""}${crashed ? " is-crashed" : ""}${cashed ? " is-cashed" : ""}`}
      >
        <div className="crash-stars" style={{ backgroundPositionY: `${sceneY * 0.35}px` }} />
        <div className="crash-stars2" style={{ backgroundPositionY: `${sceneY * 0.9}px` }} />
        <div className="crash-horizon" style={{ transform: `translateY(${climb * 40}%)` }} />
        <svg className="crash-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d={`M8,88 Q ${(8 + rocketX) / 2},${(88 + rocketY) / 2 + 8} ${rocketX},${rocketY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <div className="crash-mult">{(phase === "idle" ? 1 : mult).toFixed(2)}×</div>
        <span className="rocket" style={{ left: `${rocketX}%`, top: `${rocketY}%` }}>
          {crashed ? "💥" : "🚀"}
        </span>
        {phase === "ended" && result && (
          <div className="crash-note">
            {result.win
              ? `Cashed at ${result.cashedAt?.toFixed(2)}× · it would've crashed @ ${result.crashedAt.toFixed(2)}×`
              : `Crashed at ${result.crashedAt.toFixed(2)}× — no cash-out in time`}
          </div>
        )}
      </div>
    </GameShell>
  );
}
