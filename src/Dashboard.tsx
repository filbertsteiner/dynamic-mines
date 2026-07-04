import {
  useUser,
  useWalletAccounts,
  useInitStatus,
  useLogout,
  useDynamicClient,
} from "@dynamic-labs-sdk/react-hooks";
import { isEvmWalletAccount } from "@dynamic-labs-sdk/evm";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { LOGO_URL } from "./config";
import { LoginShowcase } from "./login/LoginShowcase";
import { GameProvider } from "./game/GameProvider";
import { WalletPanel } from "./game/WalletPanel";
import { MinesBoard } from "./game/MinesBoard";
import { StatsPanel } from "./game/StatsPanel";

export function Dashboard() {
  const { data: initStatus } = useInitStatus();
  const { data: user } = useUser();
  const { data: accounts = [] } = useWalletAccounts();
  const { mutate: logout } = useLogout();
  const client = useDynamicClient();

  // Hooks return null/empty before init completes — gate on this.
  if (initStatus !== "finished") return <p>Loading…</p>;

  if (!user) return <LoginShowcase />;

  const evmAccount = (accounts as WalletAccount[]).find(isEvmWalletAccount);

  return (
    <div className="app">
      <div className="appbar">
        <div className="brand">
          <img src={LOGO_URL} alt="" />
          <span className="wordmark">Dynamic Mines</span>
        </div>
        <div className="row">
          <span className="who">{user.email}</span>
          <button className="ghost" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </div>

      {!evmAccount ? (
        <p className="hint">Creating your wallet…</p>
      ) : (
        <GameProvider address={evmAccount.address}>
          <div className="layout">
            <main className="main">
              <MinesBoard />
            </main>
            <aside className="side">
              <WalletPanel walletAccount={evmAccount} client={client} />
              <StatsPanel name={user.email?.split("@")[0] ?? "you"} />
            </aside>
          </div>
        </GameProvider>
      )}
    </div>
  );
}
