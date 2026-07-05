// Generates brand logo SVGs into public/logos/ from @iconify-json/logos
// (full-color) and simple-icons (brand-color marks). Run: npm run gen:logos
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import * as si from "simple-icons";

mkdirSync("public/logos", { recursive: true });

// --- Full-color logos from the Iconify "logos" set ---
const logos = JSON.parse(
  readFileSync("node_modules/@iconify-json/logos/icons.json", "utf8")
);
const COLOR = {
  google: "google",
  microsoft: "microsoft-icon",
  apple: "apple",
  discord: "discord-icon",
  github: "github-icon",
  metamask: "metamask-icon",
};
for (const [out, name] of Object.entries(COLOR)) {
  const ic = logos.icons[name];
  if (!ic) throw new Error(`missing logos icon: ${name}`);
  const w = ic.width ?? logos.width ?? 24;
  const h = ic.height ?? logos.height ?? 24;
  writeFileSync(
    `public/logos/${out}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${ic.body}</svg>`
  );
}

// --- Brand-color marks from simple-icons ---
const MONO = {
  x: si.siX,
  farcaster: si.siFarcaster,
  coinbase: si.siCoinbase,
  walletconnect: si.siWalletconnect,
};
for (const [out, ic] of Object.entries(MONO)) {
  writeFileSync(
    `public/logos/${out}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#${ic.hex}" d="${ic.path}"/></svg>`
  );
}

// --- Phantom (not in either set) — hand-drawn mark in Phantom purple ---
writeFileSync(
  "public/logos/phantom.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#AB9FF2" d="M12 3a8 8 0 0 0-8 8v8.2c0 .6.7 1 1.2.6l1.6-1.3c.3-.2.7-.2 1 0l1.6 1.3c.3.2.7.2 1 0l1.6-1.3c.3-.2.7-.2 1 0l1.6 1.3c.3.2.7.2 1 0l1.6-1.3c.3-.2.7-.2 1 0l1 .8c.5.4 1.2 0 1.2-.6V11a8 8 0 0 0-8-8Z"/><circle cx="9" cy="11" r="1.4" fill="#fff"/><circle cx="15" cy="11" r="1.4" fill="#fff"/></svg>`
);

console.log("Wrote public/logos/*.svg");
