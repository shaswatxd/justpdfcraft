# JustPDFCraft — Production Deployment Guide

**Target Platform:** GitHub Pages with Custom Domain  
**Production Domain:** [https://justpdfcraft.xyz](https://justpdfcraft.xyz)  
**CI/CD Pipeline:** GitHub Actions (`.github/workflows/deploy.yml`)

---

## 1. Automated GitHub Actions Pipeline

The project uses continuous deployment on push to `main`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4
```

---

## 2. GitHub Pages SPA Routing Trampoline (`404.html`)

Because GitHub Pages is a static file host, visiting non-root paths directly (such as `https://justpdfcraft.xyz/merge-pdf`) serves `404.html`.

A lightweight script in `public/404.html` captures the intended path and replaces the browser state with:
`https://justpdfcraft.xyz/?p=/merge-pdf`
`index.html` parses `p` and restores `window.history.replaceState` seamlessly, preserving clean URLs for the user and search engines.

---

## 3. Local Verification Runbook

Before pushing to `main`, run the local verification suite:

```bash
# 1. Type checking and production bundle compilation
npm run build

# 2. Run all Vitest unit & integration test suites
npm test

# 3. Run exhaustive Playwright browser tool audit
npm run audit:full

# 4. Run multi-device responsive layout audit
npm run audit:responsive
```

---

## 4. Rollback Procedure

If a deployed build exhibits an unexpected defect:
1. Identify the previous stable commit (e.g., `git log -n 5 --oneline`).
2. Run `git revert <commit-hash>` or reset to the known stable tag.
3. Push the reversion commit to `origin/main`.
4. GitHub Actions will automatically rebuild and deploy the restored state in under 60 seconds.
5. The pre-overhaul snapshot is safely preserved in branch `backup/pre-overhaul-2026-11-01`.
