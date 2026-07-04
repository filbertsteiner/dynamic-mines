import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type LogCategory = "auth" | "wallet" | "network" | "tx" | "game";

export interface LogEntry {
  id: number;
  ts: number;
  category: LogCategory;
  // true = a real blockchain transaction/read; false = SDK/local activity.
  onChain: boolean;
  title: string;
  detail?: string;
}

interface DevLogValue {
  entries: LogEntry[];
  log: (e: Omit<LogEntry, "id" | "ts">) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const DevLogContext = createContext<DevLogValue | null>(null);
const MAX_ENTRIES = 250;

export function DevLogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const idRef = useRef(0);

  const log = useCallback((e: Omit<LogEntry, "id" | "ts">) => {
    setEntries((prev) =>
      [{ ...e, id: idRef.current++, ts: Date.now() }, ...prev].slice(
        0,
        MAX_ENTRIES
      )
    );
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const value = useMemo(
    () => ({ entries, log, clear, drawerOpen, setDrawerOpen }),
    [entries, log, clear, drawerOpen]
  );

  return (
    <DevLogContext.Provider value={value}>{children}</DevLogContext.Provider>
  );
}

export function useDevLog() {
  const ctx = useContext(DevLogContext);
  if (!ctx) throw new Error("useDevLog must be used within a DevLogProvider");
  return ctx;
}
