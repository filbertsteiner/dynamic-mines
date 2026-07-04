import "./App.css";
import { Dashboard } from "./Dashboard";
import { WaasBootstrap } from "./WaasBootstrap";
import { ErrorBoundary } from "./ErrorBoundary";
import { DevLogEvents } from "./dev/DevLogEvents";
import { DevDrawer } from "./dev/DevDrawer";
import { useDevLog } from "./dev/DevLog";

function App() {
  const { drawerOpen } = useDevLog();
  return (
    <>
      {/* When the dev drawer opens, the shell reflows instead of being covered. */}
      <div className={`app-shell${drawerOpen ? " dev-open" : ""}`}>
        {/* Mounted once so the embedded wallet is created on auth success. */}
        <WaasBootstrap />
        {/* Streams SDK events into the developer-mode drawer. */}
        <DevLogEvents />
        <ErrorBoundary>
          <Dashboard />
        </ErrorBoundary>
      </div>
      <DevDrawer />
    </>
  );
}

export default App;
