# Project Transfer Guide

Guide for moving the `hope-citizen-manual` (WATCHLIGHT) project to a new owner.

## What this project is

- Vanilla JS + Vite static site
- Deployed to GitHub Pages (automatic) and Cloudflare Pages (manual, serves `watchlight.info`)
- Source of truth: `github.com/icar1an/hope-citizen-manual`

## Inventory

| Asset | Location | Owner-bound? |
|---|---|---|
| Source code | GitHub repo `icar1an/hope-citizen-manual` | Yes (GitHub account) |
| GitHub Pages deploy | `.github/workflows/deploy.yml` | Runs on whichever account owns the repo |
| Cloudflare Pages project | `hope-citizen-manual` on Cloudflare | Yes (Cloudflare account) |
| Custom domain | `watchlight.info` | Yes (domain registrar + Cloudflare DNS) |
| Secrets in repo | None | — |

No API keys, tokens, or `.env` files are committed. Everything sensitive lives in the hosting accounts.

## Transfer steps

### 1. GitHub repository

**Option A — transfer ownership (preserves history, issues, stars):**
1. On `github.com/icar1an/hope-citizen-manual` → Settings → General → Danger Zone → Transfer ownership
2. Enter the new account username, confirm
3. New owner accepts the transfer invite
4. Update any local clones: `git remote set-url origin git@github.com:<new-owner>/hope-citizen-manual.git`

**Option B — fork/clone to new account:**
1. New account forks or creates a new empty repo
2. `git clone` the current repo, then `git remote set-url origin <new-url>` and `git push --all`
3. Original repo can be archived or deleted

### 2. GitHub Pages

After transfer, on the new account's repo:
1. Settings → Pages → Source: **GitHub Actions**
2. The `.github/workflows/deploy.yml` workflow runs automatically on push to `main`
3. Default URL becomes `https://<new-owner>.github.io/hope-citizen-manual/`

No tokens needed — the workflow uses built-in `id-token: write` permission.

### 3. Cloudflare Pages (watchlight.info)

The live site at `watchlight.info` is served by Cloudflare Pages, **not** GitHub Pages.

**Current Cloudflare account:** `spenser.f.wu@gmail.com`

**To transfer to a new Cloudflare account:**

1. **Move the Pages project:**
   - Cloudflare does not support direct project transfer between accounts
   - On the new account, create a new Pages project: `npx wrangler pages project create hope-citizen-manual`
   - Deploy the build: `npm run build && npx wrangler pages deploy dist --project-name hope-citizen-manual`

2. **Move the domain `watchlight.info`:**
   - If the domain is registered through Cloudflare Registrar: contact Cloudflare support for an internal transfer, or transfer to another registrar first, then back
   - If registered elsewhere (Namecheap/GoDaddy/etc.): just update nameservers to the new Cloudflare account's assigned nameservers
   - In the new Cloudflare account → Websites → Add `watchlight.info`
   - Copy the assigned nameservers and update them at the registrar

3. **Attach custom domain to new Pages project:**
   - Cloudflare dashboard → Pages → `hope-citizen-manual` → Custom domains → Add `watchlight.info`
   - Cloudflare will auto-create the DNS record

**Credentials used previously (for reference):**
- Email: `spenser.f.wu@gmail.com`
- Auth: Cloudflare Global API Key (env var `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL`)
- Config file: `wrangler.jsonc` at repo root (no secrets in it)

### 4. Local development on the new machine

```bash
git clone git@github.com:<new-owner>/hope-citizen-manual.git
cd hope-citizen-manual
npm install
npm run dev       # local dev server
npm run build     # production build → dist/
```

Node 20+ required (matches the GitHub Actions workflow).

## Post-transfer verification

- [ ] New owner can `git push` to `main`
- [ ] GitHub Actions "Deploy to GitHub Pages" workflow completes successfully on next push
- [ ] `https://<new-owner>.github.io/hope-citizen-manual/` loads
- [ ] `watchlight.info` resolves to the new Cloudflare Pages deployment
- [ ] DNS for `watchlight.info` points to the new Cloudflare account's nameservers
- [ ] Old Cloudflare Pages project deleted (to avoid dual deploys)

## Files to know about

- `index.html` — app shell
- `src/main.js` — entry, state machine, notification logic
- `src/style.css` — all styles
- `vite.config.js` — build config
- `wrangler.jsonc` — Cloudflare Pages config (safe to commit, no secrets)
- `.github/workflows/deploy.yml` — GitHub Pages CI

## Things that are NOT transferred automatically

- Cloudflare Pages project (must be recreated)
- Cloudflare DNS zone for `watchlight.info` (must be re-added)
- Domain registration (separate from Cloudflare Pages)
- Any GitHub repo secrets (there are none in this repo currently)
- Analytics/monitoring integrations (none configured)
