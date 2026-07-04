# Deploying Dynamic Mines

The app is a static Vite + React SPA (`base: './'`, relative asset paths), so it
runs at a domain root or under a subpath.

## Important: build locally, not on CI

This project's dependency versions come from the dev sandbox and are **not all
available on the public npm registry**, so `npm ci` / `npm install` on a normal
CI runner or fresh machine will fail. We therefore **build locally and publish
the finished output**. (To make the project portable, re-pin dependencies in
`package.json` to versions that exist on public npm, then regenerate the lockfile.)

## Live host: GitHub Pages

Deploy (build + publish the prebuilt `dist/` to the `gh-pages` branch):

```
npm run deploy
```

Site: `https://<your-github-user>.github.io/dynamic-mines/`

Pages must be set to serve from the **`gh-pages` branch, `/` (root)** — this is
configured once via the API in the deploy step. After that, `npm run deploy`
ships any change.

## REQUIRED after first deploy — allowlist the origin

Dynamic blocks non-allowlisted origins. Add the site's origin (scheme + host,
**no path**):

- **Dynamic → Security/Settings → Allowed Origins** → add
  `https://<your-github-user>.github.io`

Base Sepolia, social providers, and the shared vault are environment-level and
carry over automatically.

## Alternative host: Vercel / Netlify

Because CI can't `npm install`, use their CLIs to deploy the **prebuilt** folder:

```
npm run build
npx vercel deploy --prebuilt dist   # or: npx netlify deploy --dir dist --prod
```

Then add that host's origin to Allowed Origins.
