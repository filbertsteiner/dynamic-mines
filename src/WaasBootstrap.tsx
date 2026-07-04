import { useOnEvent } from "@dynamic-labs-sdk/react-hooks";
// WaaS functions are exported from the /waas subpath
import {
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
} from "@dynamic-labs-sdk/client/waas";
import { useDevLog } from "./dev/DevLog";

// Mount once inside <DynamicProvider>. After verifyOTP succeeds the embedded
// wallet does not exist yet — this creates it on the userChanged event.
export function WaasBootstrap() {
  const { log } = useDevLog();

  useOnEvent({
    event: "userChanged",
    listener: async ({ user }) => {
      if (!user) return;
      const missingChains = getChainsMissingWaasWalletAccounts();
      if (missingChains.length === 0) return;
      log({
        category: "wallet",
        onChain: false,
        title: `Provisioning embedded wallet (${missingChains.length} chain(s))`,
        detail: `createWaasWalletAccounts({ chains: ${JSON.stringify(missingChains)} })`,
      });
      await createWaasWalletAccounts({ chains: missingChains });
      log({
        category: "wallet",
        onChain: false,
        title: "Embedded (WaaS) wallet created ✓",
      });
    },
  });
  return null;
}
