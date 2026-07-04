// Configuration model for the live "Login Designer" demo — shows how flexibly a
// Dynamic-powered sign-in can be composed and styled.

export type LoginLayout = "centered" | "split" | "compact";
export type LoginTheme = "midnight" | "aurora" | "light";

export interface LoginConfig {
  layout: LoginLayout;
  theme: LoginTheme;
  accent: string;
  brandName: string;
  tagline: string;
  methods: {
    email: boolean;
    social: boolean;
    wallets: boolean;
    passkey: boolean;
  };
  socialAbove: boolean; // show social above email
  collapseWallets: boolean; // one "Continue with a wallet" button vs. full list
}

// Real Dynamic social providers (Dashboard → Social Providers).
export const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google", glyph: "G", color: "#ea4335" },
  { id: "apple", label: "Apple", glyph: "", color: "#f5f5f7" },
  { id: "twitter", label: "X", glyph: "𝕏", color: "#f5f5f7" },
  { id: "discord", label: "Discord", glyph: "◈", color: "#5865f2" },
  { id: "farcaster", label: "Farcaster", glyph: "⁂", color: "#8a63d2" },
  { id: "github", label: "GitHub", glyph: "", color: "#f5f5f7" },
] as const;

export const WALLETS = [
  { id: "metamask", label: "MetaMask", glyph: "🦊" },
  { id: "coinbase", label: "Coinbase Wallet", glyph: "🔵" },
  { id: "walletconnect", label: "WalletConnect", glyph: "🔗" },
  { id: "phantom", label: "Phantom", glyph: "👻" },
  { id: "rainbow", label: "Rainbow", glyph: "🌈" },
] as const;

export const ACCENTS = ["#863bff", "#4361ee", "#14b8a6", "#ec4899", "#f59e0b"];

export interface LoginPreset {
  id: string;
  label: string;
  description: string;
  config: LoginConfig;
}

export const PRESETS: LoginPreset[] = [
  {
    id: "minimal",
    label: "Minimal",
    description: "Just email — fastest onboarding, zero crypto jargon.",
    config: {
      layout: "centered",
      theme: "midnight",
      accent: "#863bff",
      brandName: "Dynamic Mines",
      tagline: "Dig for gems, dodge the bombs.",
      methods: { email: true, social: false, wallets: false, passkey: false },
      socialAbove: false,
      collapseWallets: false,
    },
  },
  {
    id: "social",
    label: "Social-first",
    description: "One-tap social sign-in with email fallback.",
    config: {
      layout: "centered",
      theme: "aurora",
      accent: "#4361ee",
      brandName: "Dynamic Mines",
      tagline: "Sign in and start playing in seconds.",
      methods: { email: true, social: true, wallets: false, passkey: false },
      socialAbove: true,
      collapseWallets: false,
    },
  },
  {
    id: "web3",
    label: "Web3 / BYO wallet",
    description: "Wallet-first for crypto-native users, split-screen brand.",
    config: {
      layout: "split",
      theme: "midnight",
      accent: "#14b8a6",
      brandName: "Dynamic Mines",
      tagline: "Connect your wallet and play on-chain.",
      methods: { email: true, social: false, wallets: true, passkey: false },
      socialAbove: false,
      collapseWallets: false,
    },
  },
  {
    id: "everything",
    label: "Everything",
    description: "The full menu — social, wallets, email, and passkeys.",
    config: {
      layout: "compact",
      theme: "aurora",
      accent: "#ec4899",
      brandName: "Dynamic Mines",
      tagline: "Your wallet, your way.",
      methods: { email: true, social: true, wallets: true, passkey: true },
      socialAbove: true,
      collapseWallets: true,
    },
  },
];

const STORAGE_KEY = "dynamic-mines-login-config";

export function loadLoginConfig(): LoginConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LoginConfig;
  } catch {
    /* ignore */
  }
  return PRESETS[0].config;
}

export function saveLoginConfig(config: LoginConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
