import { useState, type ReactNode } from "react";
import { useGame } from "./GameProvider";

// Shared chrome for every game board so the header, wager field, option control,
// and action buttons are IDENTICAL in size/placement across Mines, Plinko, and
// Crash. Only the board (children) and the game-specific pieces change as you
// toggle games — everything else stays put for a consistent flow.
export function GameShell({
  title,
  status,
  options,
  actions,
  wagerDisabled,
  hint,
  children,
}: {
  title: string;
  status: ReactNode; // right side of the header (live status / result / tagline)
  options?: ReactNode; // game-specific control(s) that sit after Wager
  actions: ReactNode; // primary action button(s), pinned to the right
  wagerDisabled?: boolean;
  hint: ReactNode;
  children: ReactNode; // the game board
}) {
  const { credits, wager, setWager } = useGame();
  // Local text state so the field can be cleared/edited freely; re-syncs on blur.
  const [wagerText, setWagerText] = useState(String(wager));

  return (
    <div className="panel game-panel">
      <div className="row game-head">
        <p className="panel-title">{title}</p>
        <div className="game-status">{status}</div>
      </div>

      <div className="setup game-setup">
        <label>
          Wager
          <input
            type="number"
            min={1}
            max={credits}
            value={wagerText}
            disabled={wagerDisabled}
            onChange={(e) => {
              setWagerText(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) setWager(n);
            }}
            onBlur={() => setWagerText(String(wager))}
          />
        </label>
        {options}
        <div className="setup-actions">{actions}</div>
      </div>

      {children}

      <div className="hint game-hint">{hint}</div>
    </div>
  );
}
