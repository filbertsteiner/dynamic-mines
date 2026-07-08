import { useState } from "react";

// Confirmation gate for a sensitive operator action (e.g. sweeping revenue to
// the treasury). Reviews the action and requires an explicit authorization.
//
// NOTE: the real protection is on-chain — the vault's `sweep` is owner-only and
// can only move realized revenue. In production this step is where Dynamic
// step-up auth (MFA / OTP elevated token) and Fireblocks policy approval gate
// the action before funds move.
export function StepUpModal({
  action,
  detail,
  onConfirm,
  onClose,
}: {
  action: string;
  detail: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [authorized, setAuthorized] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal wc-modal" onClick={(e) => e.stopPropagation()}>
        <button className="wc-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="wc-head">
          <strong>Confirm {action}</strong>
          <p className="hint">{detail}</p>
        </div>

        <label className="check" style={{ justifyContent: "center" }}>
          <input
            type="checkbox"
            checked={authorized}
            onChange={(e) => setAuthorized(e.target.checked)}
          />
          I authorize this treasury sweep
        </label>

        <button className="accent" disabled={!authorized} onClick={onConfirm}>
          Confirm &amp; sweep
        </button>

        <p className="hint">
          Sensitive action. In production this is gated by Dynamic step-up auth
          (MFA / one-time code) and Fireblocks policy approval before funds move.
        </p>
      </div>
    </div>
  );
}
