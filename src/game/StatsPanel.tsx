import { useState } from "react";
import { LeaderboardContent } from "./LeaderboardPanel";
import { RewardsContent } from "./ProjectionPanel";

export function StatsPanel({ name }: { name: string }) {
  const [tab, setTab] = useState<"leaderboard" | "rewards">("leaderboard");

  return (
    <div className="panel">
      <div className="tabs">
        <button
          className={tab === "leaderboard" ? "on" : ""}
          onClick={() => setTab("leaderboard")}
        >
          Leaderboard
        </button>
        <button
          className={tab === "rewards" ? "on" : ""}
          onClick={() => setTab("rewards")}
        >
          Rewards
        </button>
      </div>
      {tab === "leaderboard" ? (
        <LeaderboardContent name={name} />
      ) : (
        <RewardsContent />
      )}
    </div>
  );
}
