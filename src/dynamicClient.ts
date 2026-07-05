import { createDynamicClient, initializeClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addWalletConnectEvmExtension } from "@dynamic-labs-sdk/evm/wallet-connect";
import { ENVIRONMENT_ID } from "./config";

// Environment ID is a public client identifier (safe to ship in the browser
// bundle), not a secret. It is scoped by the Allowed Origins list configured in
// the Dynamic dashboard. Never place API keys or private keys here.
export const dynamicClient = createDynamicClient({
  autoInitialize: false,
  environmentId: ENVIRONMENT_ID,
  metadata: {
    name: "Dynamic Quickstart",
    // IMPORTANT: the property is `universalLink`, not `url`
    universalLink: window.location.origin,
  },
});

// Register extensions before initialization completes. WalletConnect registers
// asynchronously (it pulls the WC Project ID from the Dynamic dashboard), so we
// wait for it before initializing the client.
addEvmExtension();

void (async () => {
  try {
    await addWalletConnectEvmExtension();
  } catch {
    /* WalletConnect not configured in dashboard — external wallets still degrade gracefully */
  }
  void initializeClient();
})();
