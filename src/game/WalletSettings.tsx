import {
  useProjectSettings,
  isProviderEnabled,
  isAnySocialEnabled,
  isKeyExportEnabled,
  type ProjectSettingsLite,
} from "../wallet/useProjectSettings";

type Status = "enabled" | "off" | "available";

interface Capability {
  icon: string;
  name: string;
  desc: string;
  // If set, status is read LIVE from the Dynamic dashboard; otherwise it's an
  // illustrative "available" capability.
  detect?: (s: ProjectSettingsLite) => boolean;
}

const CAPABILITIES: Capability[] = [
  {
    icon: "✉️",
    name: "Email login",
    desc: "One-time-code sign-in — the default for this demo.",
    detect: (s) => isProviderEnabled(s, "emailOnly"),
  },
  {
    icon: "🌐",
    name: "Social sign-in",
    desc: "Google, Apple, X, Discord, Farcaster, GitHub.",
    detect: isAnySocialEnabled,
  },
  {
    icon: "📱",
    name: "SMS / phone login",
    desc: "One-time code to a phone number.",
    detect: (s) => isProviderEnabled(s, "sms"),
  },
  {
    icon: "🔐",
    name: "Passkeys",
    desc: "Device biometrics / WebAuthn sign-in.",
    detect: (s) => isProviderEnabled(s, "passkey"),
  },
  {
    icon: "🔑",
    name: "Export private key",
    desc: "Let users export their embedded wallet key to self-custody.",
    detect: isKeyExportEnabled,
  },
  {
    icon: "🔄",
    name: "Swap tokens",
    desc: "In-wallet token swaps via Dynamic's integrations.",
  },
  {
    icon: "💳",
    name: "Buy / on-ramp",
    desc: "Fund the wallet with card or bank through a fiat on-ramp.",
  },
  {
    icon: "🔗",
    name: "Connect external wallets",
    desc: "Link MetaMask, Phantom, or 300+ wallets alongside embedded.",
  },
];

const BADGE: Record<Status, string> = {
  enabled: "Enabled",
  off: "Off",
  available: "Available",
};

export function WalletSettings({ onClose }: { onClose: () => void }) {
  const settings = useProjectSettings();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="dev-head">
          <div>
            <strong>Wallet capabilities</strong>
            <p className="hint">
              🟢 Live from your Dynamic dashboard. Flip a toggle there, refresh,
              and watch it switch on — no code change. (Grey items are
              illustrative of the full range.)
            </p>
          </div>
          <button className="ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <ul className="caps">
          {CAPABILITIES.map((c) => {
            const status: Status = c.detect
              ? c.detect(settings)
                ? "enabled"
                : "off"
              : "available";
            return (
              <li key={c.name} className={`cap${status !== "enabled" ? " soon" : ""}`}>
                <span className="cap-icon">{c.icon}</span>
                <div className="cap-body">
                  <div className="cap-name">
                    {c.name}
                    <span className={`cap-badge ${status}`}>{BADGE[status]}</span>
                  </div>
                  <div className="cap-desc">{c.desc}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
