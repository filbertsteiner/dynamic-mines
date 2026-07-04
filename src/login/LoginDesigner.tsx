import { useState } from "react";
import {
  ACCENTS,
  PRESETS,
  type LoginConfig,
  type LoginLayout,
  type LoginTheme,
} from "./loginConfig";

const LAYOUTS: LoginLayout[] = ["centered", "split", "compact"];
const THEMES: LoginTheme[] = ["midnight", "aurora", "light"];
const METHOD_KEYS = ["email", "social", "wallets", "passkey"] as const;

export function LoginDesigner({
  config,
  onChange,
}: {
  config: LoginConfig;
  onChange: (c: LoginConfig) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<LoginConfig>) => onChange({ ...config, ...patch });

  return (
    <>
      <button
        className={`designer-pill${open ? " active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        🎛️ Login Designer
      </button>

      {open && (
        <div className="designer-panel">
          <div className="dev-head">
            <div>
              <strong>Login Designer</strong>
              <p className="hint">
                Demo control — reconfigure the sign-in experience live. This is
                what a developer tunes when integrating Dynamic.
              </p>
            </div>
            <button className="ghost" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <label className="designer-label">Preset</label>
          <div className="designer-presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className="preset-btn"
                title={p.description}
                onClick={() => onChange(p.config)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="designer-label">Layout</label>
          <div className="seg">
            {LAYOUTS.map((l) => (
              <button
                key={l}
                className={config.layout === l ? "on" : ""}
                onClick={() => set({ layout: l })}
              >
                {l}
              </button>
            ))}
          </div>

          <label className="designer-label">Theme</label>
          <div className="seg">
            {THEMES.map((t) => (
              <button
                key={t}
                className={config.theme === t ? "on" : ""}
                onClick={() => set({ theme: t })}
              >
                {t}
              </button>
            ))}
          </div>

          <label className="designer-label">Accent</label>
          <div className="swatches">
            {ACCENTS.map((c) => (
              <button
                key={c}
                className={`swatch${config.accent === c ? " on" : ""}`}
                style={{ background: c }}
                onClick={() => set({ accent: c })}
              />
            ))}
          </div>

          <label className="designer-label">Methods</label>
          <div className="designer-methods">
            {METHOD_KEYS.map((m) => (
              <label key={m} className="check">
                <input
                  type="checkbox"
                  checked={config.methods[m]}
                  onChange={(e) =>
                    set({ methods: { ...config.methods, [m]: e.target.checked } })
                  }
                />
                {m}
              </label>
            ))}
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={config.socialAbove}
              onChange={(e) => set({ socialAbove: e.target.checked })}
            />
            Social above email
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={config.collapseWallets}
              onChange={(e) => set({ collapseWallets: e.target.checked })}
            />
            Collapse wallet list
          </label>

          <label className="designer-label">Brand name</label>
          <input
            value={config.brandName}
            onChange={(e) => set({ brandName: e.target.value })}
          />
        </div>
      )}
    </>
  );
}
