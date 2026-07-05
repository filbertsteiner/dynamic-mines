const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Deposit test-ETH",
    body: "Fund your embedded wallet from the faucet, then deposit into the on-chain vault to get game credits (free test money — no real value).",
  },
  {
    n: "2",
    title: "Set your bet",
    body: "Pick a wager (in credits) and how many bombs to hide in the 5×5 grid. More bombs = bigger rewards but higher risk.",
  },
  {
    n: "3",
    title: "Reveal gems 💎",
    body: "Click tiles to uncover gems. Each safe tile grows your multiplier. Hit a bomb 💣 and the round's points are gone.",
  },
  {
    n: "4",
    title: "Cash out",
    body: "Bank your points any time before hitting a bomb. Points add to your leaderboard score — climb past the degens!",
  },
  {
    n: "5",
    title: "Withdraw anytime",
    body: "Cash unused credits back out to your wallet on-chain — capped to what you deposited.",
  },
];

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="dev-head">
          <div>
            <strong>How to play</strong>
            <p className="hint">Mines — dig for gems, dodge the bombs.</p>
          </div>
          <button className="ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <ol className="howto">
          {STEPS.map((s) => (
            <li key={s.n} className="howto-step">
              <span className="howto-num">{s.n}</span>
              <div>
                <div className="howto-title">{s.title}</div>
                <div className="howto-body">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
