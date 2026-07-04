import { useEffect, useState } from "react";
import "./login.css";
import { AuthPanel } from "./AuthPanel";
import { LoginDesigner } from "./LoginDesigner";
import { loadLoginConfig, saveLoginConfig, type LoginConfig } from "./loginConfig";
import { LOGO_URL } from "../config";

function Brand({ config, big }: { config: LoginConfig; big?: boolean }) {
  return (
    <div className={`login-brand${big ? " big" : ""}`}>
      <img src={LOGO_URL} alt="" className="login-logo" />
      <h1>{config.brandName || "Dynamic Mines"}</h1>
      <p className="login-tagline">{config.tagline}</p>
    </div>
  );
}

export function LoginShowcase() {
  const [config, setConfig] = useState<LoginConfig>(loadLoginConfig);

  useEffect(() => saveLoginConfig(config), [config]);

  const card = (
    <div className="login-card">
      <AuthPanel config={config} />
      <p className="login-foot">Powered by Dynamic · embedded wallets</p>
    </div>
  );

  return (
    <div
      className={`login-stage theme-${config.theme} layout-${config.layout}`}
      style={{ ["--accent" as string]: config.accent }}
    >
      {config.layout === "split" ? (
        <div className="login-split">
          <div className="login-hero-panel">
            <Brand config={config} big />
            <ul className="hero-points">
              <li>✓ No seed phrases</li>
              <li>✓ Email, social, or your own wallet</li>
              <li>✓ On-chain in one click</li>
            </ul>
          </div>
          <div className="login-form-panel">{card}</div>
        </div>
      ) : (
        <div className={`login-centered ${config.layout}`}>
          <Brand config={config} />
          {card}
        </div>
      )}

      <LoginDesigner config={config} onChange={setConfig} />
    </div>
  );
}
