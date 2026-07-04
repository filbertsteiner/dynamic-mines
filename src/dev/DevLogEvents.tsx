import { useOnEvent } from "@dynamic-labs-sdk/react-hooks";
import { useDevLog } from "./DevLog";

// Subscribes to Dynamic client events and streams them into the dev log.
// Mounted once, inside DynamicProvider + DevLogProvider.
export function DevLogEvents() {
  const { log } = useDevLog();

  useOnEvent({
    event: "initStatusChanged",
    listener: ({ initStatus }) =>
      log({ category: "auth", onChain: false, title: `SDK init → ${initStatus}` }),
  });

  useOnEvent({
    event: "userChanged",
    listener: ({ user }) =>
      log({
        category: "auth",
        onChain: false,
        title: user
          ? `User authenticated: ${user.email ?? user.id}`
          : "User signed out",
        detail: user
          ? JSON.stringify({ id: user.id, email: user.email }, null, 2)
          : undefined,
      }),
  });

  useOnEvent({
    event: "walletAccountsChanged",
    listener: ({ walletAccounts }) =>
      log({
        category: "wallet",
        onChain: false,
        title: `Wallet accounts updated (${walletAccounts.length})`,
        detail: JSON.stringify(
          walletAccounts.map((w) => ({ chain: w.chain, address: w.address })),
          null,
          2
        ),
      }),
  });

  useOnEvent({
    event: "walletProviderChanged",
    listener: () =>
      log({ category: "wallet", onChain: false, title: "Wallet provider changed" }),
  });

  useOnEvent({
    event: "tokenChanged",
    listener: ({ token }) =>
      log({
        category: "auth",
        onChain: false,
        title: token ? "Session JWT issued" : "Session JWT cleared",
      }),
  });

  useOnEvent({
    event: "logout",
    listener: () => log({ category: "auth", onChain: false, title: "Logout" }),
  });

  return null;
}
