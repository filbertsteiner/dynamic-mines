import { useGame } from "./GameProvider";
import { MinesBoard } from "./MinesBoard";
import { PlinkoBoard } from "./PlinkoBoard";

// Switches between the two games. Both share the same credits/points/score
// plumbing, so the wallet, on-chain settlement, and leaderboard work for either.
export function GameArea() {
  const { game, setGame } = useGame();
  return (
    <>
      <div className="tabs game-tabs">
        <button className={game === "mines" ? "on" : ""} onClick={() => setGame("mines")}>
          💎 Mines
        </button>
        <button className={game === "plinko" ? "on" : ""} onClick={() => setGame("plinko")}>
          ⚡ Dynamic
        </button>
      </div>
      {game === "mines" ? <MinesBoard /> : <PlinkoBoard />}
    </>
  );
}
