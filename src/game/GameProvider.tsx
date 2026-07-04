import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  startRound,
  currentPoints,
  type MinesRound,
} from "./mines";

interface GameState {
  credits: number;
  // Total credits ever funded by real on-chain deposits. Withdrawals are capped
  // to this so you can never take out more than you put in — no house bank needed.
  depositedCredits: number;
  // Cumulative leaderboard points banked across all rounds.
  score: number;
  round: MinesRound | null;
  // Current bet setup, shared so the Rewards chart can reflect it live.
  wager: number;
  mineCount: number;
}

interface GameContextValue extends GameState {
  addDepositCredits: (amount: number) => void;
  withdrawableCredits: number;
  withdrawCredits: (amount: number) => void;
  setWager: (n: number) => void;
  setMineCount: (n: number) => void;
  beginRound: (wager: number, mineCount: number) => void;
  reveal: (tile: number) => void;
  cashOut: () => void;
  clearRound: () => void;
  // The most recent points banked, for a real-time "+X" flourish.
  lastBank: { gain: number; at: number } | null;
}

const GameContext = createContext<GameContextValue | null>(null);

// Demo memory is intentionally short-lived: state survives refreshes for an hour,
// then auto-resets so you can always show the fresh "no funds → deposit" flow.
const SESSION_TTL_MS = 60 * 60 * 1000;

// Persist credits per wallet address so a refresh doesn't wipe the session.
function storageKey(address: string) {
  return `mines-game:${address.toLowerCase()}`;
}

export function GameProvider({
  address,
  children,
}: {
  address: string;
  children: ReactNode;
}) {
  const [credits, setCredits] = useState(0);
  const [depositedCredits, setDepositedCredits] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState<MinesRound | null>(null);
  const [lastBank, setLastBank] = useState<{ gain: number; at: number } | null>(
    null
  );
  const [wager, setWager] = useState(10);
  const [mineCount, setMineCount] = useState(3);

  // Load saved balances when the wallet address becomes known / changes.
  useEffect(() => {
    const raw = localStorage.getItem(storageKey(address));
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Pick<
          GameState,
          "credits" | "depositedCredits" | "score"
        > & { savedAt?: number };
        const fresh =
          saved.savedAt !== undefined &&
          Date.now() - saved.savedAt < SESSION_TTL_MS;
        if (fresh) {
          setCredits(saved.credits ?? 0);
          setDepositedCredits(saved.depositedCredits ?? 0);
          setScore(saved.score ?? 0);
        } else {
          // Expired demo session — start clean.
          localStorage.removeItem(storageKey(address));
          setCredits(0);
          setDepositedCredits(0);
          setScore(0);
        }
      } catch {
        /* ignore corrupt storage */
      }
    } else {
      setCredits(0);
      setDepositedCredits(0);
      setScore(0);
    }
    setRound(null);
  }, [address]);

  // Save on any balance change.
  useEffect(() => {
    localStorage.setItem(
      storageKey(address),
      JSON.stringify({ credits, depositedCredits, score, savedAt: Date.now() })
    );
  }, [address, credits, depositedCredits, score]);

  const value = useMemo<GameContextValue>(() => {
    const withdrawableCredits = Math.min(credits, depositedCredits);

    return {
      credits,
      depositedCredits,
      score,
      round,
      withdrawableCredits,
      lastBank,
      wager,
      mineCount,
      setWager,
      setMineCount,

      addDepositCredits: (amount: number) => {
        setCredits((c) => c + amount);
        setDepositedCredits((d) => d + amount);
      },

      withdrawCredits: (amount: number) => {
        const capped = Math.min(amount, credits, depositedCredits);
        setCredits((c) => c - capped);
        setDepositedCredits((d) => d - capped);
      },

      beginRound: (wager: number, mineCount: number) => {
        if (wager <= 0 || wager > credits) return;
        // Wager is spent to play (arcade-style). Points are the reward.
        setCredits((c) => c - wager);
        setRound(startRound(wager, mineCount));
      },

      reveal: (tile: number) => {
        setRound((r) => {
          if (!r || r.status !== "playing" || r.revealed.has(tile)) return r;
          const revealed = new Set(r.revealed).add(tile);
          if (r.minePositions.has(tile)) {
            // Hit a bomb — the round's potential points are lost.
            return { ...r, revealed, status: "busted" };
          }
          return { ...r, revealed };
        });
      },

      cashOut: () => {
        // NOTE: never nest setScore inside a setRound updater — Strict Mode
        // double-invokes updaters, which double-counted the banked points.
        if (!round || round.status !== "playing" || round.revealed.size === 0)
          return;
        const gain = currentPoints(round);
        setScore((s) => s + gain);
        setLastBank({ gain, at: Date.now() });
        setRound({ ...round, status: "cashed" });
      },

      clearRound: () => setRound(null),
    };
  }, [credits, depositedCredits, score, round, lastBank, wager, mineCount]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a GameProvider");
  return ctx;
}
