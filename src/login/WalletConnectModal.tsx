import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { connectAndVerifyWithWalletConnectEvm } from "@dynamic-labs-sdk/evm/wallet-connect";
import { useDevLog } from "../dev/DevLog";

// Real WalletConnect flow: start a session, show the pairing URI as a QR code,
// and wait for the wallet (Fireblocks, MetaMask mobile, etc.) to approve — which
// connects and authenticates the user. The WC Project ID comes from the Dynamic
// dashboard (Branded Wallets → WalletConnect).
export function WalletConnectModal({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}) {
  const { log } = useDevLog();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        log({ category: "wallet", onChain: false, title: `connectAndVerifyWithWalletConnectEvm() — ${label}` });
        const { uri, approval } = await connectAndVerifyWithWalletConnectEvm();
        setUri(uri);
        await approval(); // resolves when the wallet approves → user authenticated
        log({ category: "wallet", onChain: false, title: "WalletConnect approved ✓" });
        onClose();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log({ category: "wallet", onChain: false, title: "WalletConnect failed", detail: msg });
        setError(msg);
      }
    })();
  }, [label, log, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal wc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dev-head">
          <div>
            <strong>Connect {label}</strong>
            <p className="hint">Scan with any WalletConnect wallet (incl. Fireblocks).</p>
          </div>
          <button className="ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {error ? (
          <p className="hint err">
            {error}
            <br />
            If this persists, set a WalletConnect Project ID in Dynamic → Branded
            Wallets → WalletConnect.
          </p>
        ) : uri ? (
          <div className="wc-body">
            <div className="wc-qr">
              <QRCode value={uri} size={200} bgColor="#ffffff" fgColor="#0b0912" />
            </div>
            <div className="wc-actions">
              <a className="ghost-wide" href={uri}>
                Open in wallet
              </a>
              <button
                className={`copy-btn${copied ? " copied" : ""}`}
                onClick={() => {
                  void navigator.clipboard.writeText(uri);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "✓ Copied URI" : "Copy URI"}
              </button>
            </div>
          </div>
        ) : (
          <p className="hint">Starting WalletConnect…</p>
        )}
      </div>
    </div>
  );
}
