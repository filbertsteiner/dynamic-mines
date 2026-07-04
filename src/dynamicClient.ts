import { createDynamicClient, initializeClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
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

// Register extensions immediately, before initialization completes.
// Extension functions take NO arguments — do not pass the client instance.
addEvmExtension();

void initializeClient();
