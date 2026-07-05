import { useState } from "react";
import { useSendEmailOTP, useVerifyOTP } from "@dynamic-labs-sdk/react-hooks";
import { signInWithSocialPopUp } from "@dynamic-labs-sdk/client";
import { useDevLog } from "../dev/DevLog";
import {
  useProjectSettings,
  isProviderEnabled,
} from "../wallet/useProjectSettings";
import { SOCIAL_PROVIDERS, WALLETS, type LoginConfig } from "./loginConfig";

function EmailAuth() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const { log } = useDevLog();
  const { mutate: sendEmailOTP, data: otpVerification } = useSendEmailOTP();
  const { mutate: verifyOTP } = useVerifyOTP();

  if (otpVerification) {
    return (
      <div className="auth-email">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
          inputMode="numeric"
        />
        <button
          className="accent"
          disabled={!code}
          onClick={() => {
            log({ category: "auth", onChain: false, title: "verifyOTP(code)" });
            verifyOTP({ otpVerification, verificationToken: code });
          }}
        >
          Verify &amp; enter
        </button>
      </div>
    );
  }

  return (
    <div className="auth-email">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <button
        className="accent"
        disabled={!email}
        onClick={() => {
          log({ category: "auth", onChain: false, title: `sendEmailOTP("${email}")` });
          sendEmailOTP({ email });
        }}
      >
        Continue with email
      </button>
    </div>
  );
}

function SocialAuth() {
  const { log } = useDevLog();
  const settings = useProjectSettings();
  const [note, setNote] = useState<string | null>(null);

  // Call the popup sign-in DIRECTLY in the click handler (not via react-query
  // mutate) so window.open keeps the user-gesture and the browser doesn't block
  // the popup. Surface the real error for providers that are actually enabled.
  async function connect(id: string, label: string) {
    setNote(null);
    const enabled = isProviderEnabled(settings, id);
    log({ category: "auth", onChain: false, title: `signInWithSocialPopUp("${id}")` });
    try {
      await signInWithSocialPopUp({ provider: id as never });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log({ category: "auth", onChain: false, title: `social sign-in failed: ${label}`, detail: msg });
      setNote(
        enabled
          ? `${label} sign-in error: ${msg}`
          : `Enable ${label} in Dashboard → Social Providers to activate this button.`
      );
    }
  }

  return (
    <div className="auth-social">
      <div className="social-grid">
        {SOCIAL_PROVIDERS.map((p) => (
          <button
            key={p.id}
            className={`social-btn${isProviderEnabled(settings, p.id) ? " live" : ""}`}
            title={
              isProviderEnabled(settings, p.id)
                ? `Continue with ${p.label} (live)`
                : `${p.label} — enable in dashboard`
            }
            onClick={() => void connect(p.id, p.label)}
          >
            <span className="social-glyph" style={{ color: p.color }}>
              {p.glyph}
            </span>
            {p.label}
            {isProviderEnabled(settings, p.id) && <span className="live-dot" />}
          </button>
        ))}
      </div>
      {note && <p className="auth-note">{note}</p>}
    </div>
  );
}

function WalletAuth({ collapsed }: { collapsed: boolean }) {
  const { log } = useDevLog();
  const [note, setNote] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!collapsed);

  function attempt(label: string) {
    log({ category: "wallet", onChain: false, title: `connectWithWalletProvider("${label}")` });
    setNote(
      "Wallet connect uses useConnectWithWalletProvider — register wallet discovery to activate."
    );
  }

  if (collapsed && !expanded) {
    return (
      <button className="wallet-collapse" onClick={() => setExpanded(true)}>
        🔗 Continue with a wallet
      </button>
    );
  }

  return (
    <div className="auth-wallets">
      {WALLETS.map((w) => (
        <button
          key={w.id}
          className={`wallet-btn${w.recommended ? " recommended" : ""}`}
          onClick={() => attempt(w.label)}
        >
          <span className="wallet-glyph">{w.glyph}</span>
          {w.label}
          {w.note && <span className="wallet-note">{w.note}</span>}
          {w.recommended && <span className="wallet-rec">Recommended</span>}
        </button>
      ))}
      {note && <p className="auth-note">{note}</p>}
    </div>
  );
}

function PasskeyAuth() {
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <button
        className="ghost-wide"
        onClick={() =>
          setNote("Passkey sign-in uses useSignInWithPasskey — enable passkeys in your dashboard.")
        }
      >
        🔐 Sign in with a passkey
      </button>
      {note && <p className="auth-note">{note}</p>}
    </>
  );
}

function Divider() {
  return <div className="auth-divider"><span>or</span></div>;
}

export function AuthPanel({ config }: { config: LoginConfig }) {
  const { methods, socialAbove, collapseWallets } = config;
  const showDivider =
    methods.email && (methods.social || methods.wallets || methods.passkey);

  const social = methods.social && <SocialAuth key="social" />;
  const email = methods.email && <EmailAuth key="email" />;
  const wallets = methods.wallets && (
    <WalletAuth key="wallets" collapsed={collapseWallets} />
  );
  const passkey = methods.passkey && <PasskeyAuth key="passkey" />;

  const top = socialAbove ? social : email;
  const bottom = socialAbove ? email : social;

  return (
    <div className="auth-panel">
      {top}
      {showDivider && <Divider />}
      {bottom}
      {wallets}
      {passkey}
    </div>
  );
}
