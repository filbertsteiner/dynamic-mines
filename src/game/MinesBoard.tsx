import { useEffect, useRef, useState } from "react";
import { useGame } from "./GameProvider";
import { TILE_COUNT, currentPoints, currentMultiplier } from "./mines";
import { HowToPlay } from "./HowToPlay";
import { GameShell } from "./GameShell";
import { useDevLog } from "../dev/DevLog";

const MINE_OPTIONS = [1, 3, 5];

export function MinesBoard() {
  const {
    credits,
    round,
    wager,
    mineCount,
    setMineCount,
    beginRound,
    reveal,
    cashOut,
    clearRound,
  } = useGame();
  const { log } = useDevLog();
  const [showHelp, setShowHelp] = useState(false);

  const playing = round?.status === "playing";
  const finished = round?.status === "busted" || round?.status === "cashed";

  // Log round outcomes (local game logic — no chain tx).
  const lastStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (round?.status && round.status !== lastStatus.current) {
      if (round.status === "busted")
        log({ category: "game", onChain: false, title: "💥 Busted — points lost (local)" });
      if (round.status === "cashed")
        log({
          category: "game",
          onChain: false,
          title: `Banked ${currentPoints(round)} pts (local)`,
        });
    }
    lastStatus.current = round?.status;
  }, [round?.status, round, log]);

  function play() {
    log({
      category: "game",
      onChain: false,
      title: `Round started · ${wager} credits · ${mineCount} bombs`,
      detail: "Game credits are tracked locally — no blockchain transaction.",
    });
    beginRound(wager, mineCount);
  }

  const canPlay = wager > 0 && wager <= credits;

  const status = !round ? (
    <span className="label">reveal gems, avoid bombs</span>
  ) : playing ? (
    <span className="live">
      {currentMultiplier(round).toFixed(2)}× ·{" "}
      <strong>{currentPoints(round).toLocaleString()}</strong> pts
    </span>
  ) : round.status === "cashed" ? (
    <strong className="ok result-tag">✅ +{currentPoints(round).toLocaleString()} pts</strong>
  ) : (
    <strong className="err result-tag">💥 Busted</strong>
  );

  const options = (
    <label>
      Bombs
      <select
        value={mineCount}
        disabled={!!round}
        onChange={(e) => setMineCount(Number(e.target.value))}
      >
        {MINE_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </label>
  );

  const actions = !round ? (
    <button className="play-btn" onClick={play} disabled={!canPlay}>
      {credits <= 0 ? "Deposit to play" : `Bet ${wager}`}
    </button>
  ) : playing ? (
    <button className="cashout" onClick={cashOut} disabled={round.revealed.size === 0}>
      Cash out
    </button>
  ) : (
    <>
      <button className="play-btn" onClick={play} disabled={!canPlay}>
        Play again
      </button>
      <button className="secondary" onClick={clearRound}>
        Clear
      </button>
    </>
  );

  const hint = (
    <>
      Reveal gems, avoid bombs — each safe tile lifts your multiplier. Each wager
      settles on-chain as revenue.{" "}
      <button className="link" onClick={() => setShowHelp(true)}>
        How to play →
      </button>
    </>
  );

  return (
    <GameShell
      title="Mines"
      status={status}
      options={options}
      actions={actions}
      wagerDisabled={!!round}
      hint={hint}
    >
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
      <div className="grid">
        {Array.from({ length: TILE_COUNT }, (_, i) => {
          const isRevealed = round?.revealed.has(i);
          const isMine = round?.minePositions.has(i);
          const showAll = finished;
          const show = isRevealed || (showAll && isMine);
          let cls = "tile";
          if (show) cls += isMine ? " tile-mine" : " tile-gem";
          return (
            <button
              key={i}
              className={cls}
              disabled={!playing || isRevealed}
              onClick={() => reveal(i)}
            >
              {show && (
                <img
                  className="tile-icon"
                  src={`${import.meta.env.BASE_URL}game/${isMine ? "mine-filled" : "safe-filled"}.svg`}
                  alt={isMine ? "bomb" : "gem"}
                />
              )}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
