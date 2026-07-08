import { baseSepolia } from "viem/chains";
import type { NetworkData } from "@dynamic-labs-sdk/client";

// Dynamic environment ID (public client identifier, not a secret). Overridable
// via the VITE_DYNAMIC_ENVIRONMENT_ID env var for different deploys; falls back
// to this sandbox environment. Must match the environment (Sandbox vs Live)
// where you enable chains in the dashboard.
export const ENVIRONMENT_ID =
  import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID ??
  "3053ea12-30a5-4bb3-bf60-57566be7cf71";

// Logo path that is correct at the domain root AND under a subpath (GitHub
// Pages). BASE_URL is injected by Vite from the `base` config.
export const LOGO_URL = `${import.meta.env.BASE_URL}favicon.svg`;

// The chain the game runs on. Base Sepolia is a FREE test network — the ETH
// here has no real value. Get some from a faucet (see FAUCET_URL below).
export const GAME_CHAIN = baseSepolia;

// Network definition registered with the Dynamic wallet at runtime (via
// addNetwork) so sending works even if the dashboard's network list doesn't
// include Base Sepolia. networkId is the chain id as a string.
export const GAME_NETWORK_DATA: NetworkData = {
  chain: "EVM",
  networkId: String(baseSepolia.id),
  name: "base-sepolia",
  displayName: "Base Sepolia",
  iconUrl: "https://sepolia.basescan.org/images/favicon.ico",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { http: ["https://sepolia.base.org"] },
  blockExplorerUrls: ["https://sepolia.basescan.org"],
  testnet: true,
};

// Deposits/withdrawals run through an escrow contract (contracts/GameVault.sol).
//
// SHARED_VAULT_ADDRESS: set this to a deployed GameVault address to make ONE
// vault serve every visitor (the live/shared demo). Deploy it once (Deploy game
// vault button), copy the address shown, and paste it here. While null, each
// browser deploys its own vault locally (handy for solo dev).
// Shared GameVault v3 (on-chain player liabilities + surplus-only sweep).
// Deployed on Base Sepolia; every visitor deposits into this one contract.
export const SHARED_VAULT_ADDRESS: `0x${string}` | null =
  "0x658f4f3c62d9c39f1a11895b36b76520db15ee1d";

// Exchange rate between test-ETH and in-game credits.
// 1 test-ETH = 100,000 credits  →  a 0.001 ETH deposit = 100 credits.
export const CREDITS_PER_ETH = 100_000;

// Faucet where the user tops up their wallet with free Base Sepolia ETH.
export const FAUCET_URL = "https://www.alchemy.com/faucets/base-sepolia";

// Human-friendly network label for the UI.
export const NETWORK_LABEL = "Base Sepolia";

// Block explorer links.
export const EXPLORER_TX_URL = (hash: string) =>
  `https://sepolia.basescan.org/tx/${hash}`;
export const EXPLORER_ADDRESS_URL = (address: string) =>
  `https://sepolia.basescan.org/address/${address}`;
