#!/usr/bin/env bash
# Publishes the PREBUILT static site to the gh-pages branch.
# We build locally (this project's exact dependency versions only exist in the
# dev environment, not on public npm), then push the finished dist/ output —
# GitHub Pages serves it directly, no CI build required.
set -e

OWNER=$(gh api user --jq .login)
REPO=dynamic-mines

echo "Building…"
npm run build

echo "Publishing dist/ to gh-pages…"
touch dist/.nojekyll            # don't run Jekyll on the output
rm -rf dist/.git
git -C dist init -q -b gh-pages
git -C dist add -A
git -C dist -c user.name="Dynamic Mines Deploy" -c user.email="deploy@local" \
  commit -q -m "Publish site"
git -C dist push -f "https://github.com/$OWNER/$REPO.git" gh-pages

echo "Deployed → https://$OWNER.github.io/$REPO/"
