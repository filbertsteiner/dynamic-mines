import { useEffect, useRef, useState } from "react";
import { useGame } from "./GameProvider";
import { TILE_COUNT, currentPoints, currentMultiplier } from "./mines";
import { HowToPlay } from "./HowToPlay";
import { useDevLog } from "../dev/DevLog";

const MINE_OPTIONS = [1, 3, 5];

export function MinesBoard() {
  const {
    credits,
    round,
    wager,
    mineCount,
    setWager,
    setMineCount,
    beginRound,
    reveal,
    cashOut,
    clearRound,
  } = useGame();
  const { log } = useDevLog();
  const [showHelp, setShowHelp] = useState(false);
  // Local text state so the wager field can be cleared/edited freely
  // (clamping happens when a round starts, not on every keystroke).
  const [wagerText, setWagerText] = useState(String(wager));

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

  return (
    <>
      <div className="panel">
        <div className="row">
          <p className="panel-title">Mines</p>
          <button className="ghost" onClick={() => setShowHelp(true)}>
            How to play
          </button>
        </div>
        {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
        {!round && (
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
              Bombs
              <select
                value={mineCount}
                onChange={(e) => setMineCount(Number(e.target.value))}
              >
                {MINE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <button className="play-btn" onClick={play} disabled={!canPlay}>
              {credits <= 0 ? "Deposit to play" : `Play for ${wager} credits`}
            </button>
          </div>
        )}

        {round && (
          <div className="status">
            {playing && (
              <>
                <span>
                  Multiplier <strong>{currentMultiplier(round).toFixed(2)}×</strong>
                </span>
                <span>
                  Bank <strong>{currentPoints(round).toLocaleString()} pts</strong>
                </span>
                <button
                  onClick={cashOut}
                  disabled={round.revealed.size === 0}
                  className="cashout"
                >
                  Cash out
                </button>
              </>
            )}
            {round.status === "busted" && (
              <span className="err">💥 Boom! Points lost.</span>
            )}
            {round.status === "cashed" && (
              <span className="ok">
                ✅ Banked {currentPoints(round).toLocaleString()} points!
              </span>
            )}
            {finished && (
              <div className="status-actions">
                <button onClick={play} disabled={!canPlay} className="cashout">
                  Play again
                </button>
                <button onClick={clearRound} className="secondary">
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

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
      </div>
    </>
  );
}
