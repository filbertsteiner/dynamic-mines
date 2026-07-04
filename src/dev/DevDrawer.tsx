import { useLogout } from "@dynamic-labs-sdk/react-hooks";
import { useDevLog, type LogCategory } from "./DevLog";

const CATEGORY_COLOR: Record<LogCategory, string> = {
  auth: "#a78bfa",
  wallet: "#f0abfc",
  network: "#67e8f9",
  tx: "#34d399",
  game: "#fcd34d",
};

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
  });
}

export function DevDrawer() {
  const { entries, clear, drawerOpen, setDrawerOpen } = useDevLog();
  const { mutate: logout } = useLogout();

  function resetDemo() {
    // Wipe local game state for every wallet, then sign out → fresh demo.
    Object.keys(localStorage)
      .filter((k) => k.startsWith("mines-game:"))
      .forEach((k) => localStorage.removeItem(k));
    clear();
    logout();
    setDrawerOpen(false);
  }

  return (
    <>
      <button
        className={`dev-pill${drawerOpen ? " active" : ""}`}
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        ◉ Developer mode
      </button>

      <aside className={`dev-drawer${drawerOpen ? " open" : ""}`}>
        <div className="dev-head">
          <div>
            <strong>Developer Mode</strong>
            <p className="hint">Live view of the Dynamic SDK &amp; on-chain activity behind each action.</p>
          </div>
          <button className="ghost" onClick={() => setDrawerOpen(false)}>
            ✕
          </button>
        </div>

        <div className="dev-legend">
          <span>
            <span className="chip-dot" style={{ background: "#34d399" }} /> ⛓ on-chain
          </span>
          <span>
            <span className="chip-dot" style={{ background: "#a78bfa" }} /> SDK / local
          </span>
        </div>

        <div className="dev-actions">
          <button className="ghost" onClick={clear}>
            Clear log
          </button>
          <button className="ghost" onClick={resetDemo}>
            ⟲ Reset demo (wipe balance + log out)
          </button>
        </div>

        <ul className="dev-log">
          {entries.length === 0 && (
            <li className="hint">No activity yet — interact with the app.</li>
          )}
          {entries.map((e) => (
            <li key={e.id} className="dev-entry">
              <div className="dev-entry-top">
                <span
                  className="dev-cat"
                  style={{ color: CATEGORY_COLOR[e.category] }}
                >
                  {e.onChain ? "⛓ " : ""}
                  {e.category}
                </span>
                <time>{fmtTime(e.ts)}</time>
              </div>
              <div className="dev-title">{e.title}</div>
              {e.detail && <pre className="dev-detail">{e.detail}</pre>}
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
