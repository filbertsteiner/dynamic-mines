import { useGame } from "./GameProvider";
import { MinesBoard } from "./MinesBoard";
import { PlinkoBoard } from "./PlinkoBoard";
import { CrashBoard } from "./CrashBoard";

// Switches between the games. All share the same credits/points/score plumbing,
// so the wallet, on-chain settlement, and leaderboard work for any of them.
export function GameArea() {
  const { game, setGame } = useGame();
  return (
    <>
      <div className="tabs game-tabs">
        <button className={game === "mines" ? "on" : ""} onClick={() => setGame("mines")}>
          💎 Mines
        </button>
        <button className={game === "plinko" ? "on" : ""} onClick={() => setGame("plinko")}>
          ⚡ Plinko
        </button>
        <button className={game === "crash" ? "on" : ""} onClick={() => setGame("crash")}>
          🚀 Crash
        </button>
      </div>
      {game === "mines" ? (
        <MinesBoard />
      ) : game === "plinko" ? (
        <PlinkoBoard />
      ) : (
        <CrashBoard />
      )}
    </>
  );
}
