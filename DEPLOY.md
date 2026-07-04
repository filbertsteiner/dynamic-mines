# Deploying Dynamic Mines

The app is a static Vite + React SPA — any static host works. It's configured
with `base: './'` (relative asset paths), so it runs at a domain root or under a
subpath.

## Live host: GitHub Pages (default)

A GitHub Action (`.github/workflows/deploy.yml`) builds and publishes on every
push to `main`. Once set up, the site lives at:

```
https://<your-github-user>.github.io/dynamic-mines/
```

One-time setup (done by the deploy script):
1. Create a **public** repo `dynamic-mines` and push.
2. Enable Pages with **GitHub Actions** as the source.
3. Push → the workflow builds and deploys.

To ship a change afterwards: `git push` — the Action redeploys automatically.

## REQUIRED after first deploy — allowlist the origin

Dynamic blocks requests from origins that aren't allowlisted. Add the site's
origin (scheme + host, **no path**) in the dashboard:

- **Dynamic → Security/Settings → Allowed Origins** → add
  `https://<your-github-user>.github.io`

Everything else (Base Sepolia, social providers, the shared vault) is
environment-level and carries over automatically.

## Alternative host: Vercel (root domain, custom domains)

```
npm i -g vercel     # or use npx
vercel --prod
```

Vercel auto-detects Vite. Then add the Vercel URL's origin to Allowed Origins.
Optionally set `VITE_DYNAMIC_ENVIRONMENT_ID` in the host's env vars to point at a
different Dynamic environment (e.g. Live instead of Sandbox).
