import { useEffect, useState } from "react";
import {
  useUser,
  useSendEmailOTP,
  useVerifyOTP,
} from "@dynamic-labs-sdk/react-hooks";
import { useDevLog } from "../dev/DevLog";

// Step-up authentication: before a sensitive action (e.g. sweeping the vault),
// re-verify the user with the same email OTP they log in with. This mirrors
// Dynamic's step-up pattern — confirm it's really them right before it matters.
export function StepUpModal({
  action,
  onVerified,
  onClose,
}: {
  action: string;
  onVerified: () => void;
  onClose: () => void;
}) {
  const { data: user } = useUser();
  const email = user?.email;
  const { log } = useDevLog();
  const { mutate: sendEmailOTP, data: otpVerification } = useSendEmailOTP();
  const { mutate: verifyOTP, isPending } = useVerifyOTP();
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (email && !sent) {
      setSent(true);
      log({ category: "auth", onChain: false, title: `Step-up: sendEmailOTP for ${action}` });
      sendEmailOTP({ email });
    }
  }, [email, sent, action, sendEmailOTP, log]);

  function verify() {
    if (!otpVerification) return;
    setError(null);
    verifyOTP(
      { otpVerification, verificationToken: code },
      {
        onSuccess: () => {
          log({ category: "auth", onChain: false, title: `Step-up verified → ${action}` });
          onVerified();
        },
        onError: (e) => setError(e instanceof Error ? e.message : "Verification failed"),
      }
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal wc-modal" onClick={(e) => e.stopPropagation()}>
        <button className="wc-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="wc-head">
          <strong>Confirm it's you</strong>
          <p className="hint">
            Sensitive action ({action}). Enter the code we sent to{" "}
            <strong>{email ?? "your email"}</strong>.
          </p>
        </div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
          inputMode="numeric"
          style={{ width: "100%" }}
        />
        <button
          className="accent"
          disabled={!code || !otpVerification || isPending}
          onClick={verify}
        >
          {isPending ? "Verifying…" : "Verify & continue"}
        </button>
        <button className="ghost" onClick={() => email && sendEmailOTP({ email })}>
          Resend code
        </button>
        {error && <p className="hint err">{error}</p>}
      </div>
    </div>
  );
}
