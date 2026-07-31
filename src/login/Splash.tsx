import { LOGO_URL } from "../config";

// Branded full-screen loader used for every pre-arcade moment (init, social
// sign-in completion, wallet creation) so transitions are smooth — no bare
// "Loading…" text and no flash of the login screen.
export function Splash({ label }: { label: string }) {
  return (
    <div className="splash">
      <img src={LOGO_URL} alt="" className="splash-logo" />
      <p className="splash-label">{label}</p>
    </div>
  );
}
