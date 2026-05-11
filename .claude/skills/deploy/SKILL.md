---
name: deploy
description: Build and deploy hope-citizen-manual to Cloudflare Workers. Use when the user asks to deploy, ship, publish, push live, or release the site.
---

# Deploy hope-citizen-manual to Cloudflare

This project is served as a Cloudflare Worker with static assets. Worker name: `hope-citizen-manual` (see `wrangler.jsonc`). SPA routing is built in.

## FIRST: Check the freeze

Before doing anything else, check whether `FREEZE.md` exists at the repo root:

```
test -f FREEZE.md && cat FREEZE.md
```

If `FREEZE.md` is present, **stop and report it to the user**. Do not attempt
to deploy, rebuild, or rollback. The owner has locked production to a specific
worker version. Read `FREEZE.md` to find the locked version ID and the
unfreeze procedure; only proceed if the user explicitly confirms they want to
break the freeze.

## Credentials

Stored as env vars in `~/.zprofile`:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Never commit these. Never echo the full token. If either is missing, stop and ask the user to add them to `~/.zprofile` before continuing.

Wrangler auto-reads both env vars — do not pass them as flags.

## Steps

1. **Sanity check env vars** — confirm both are set (show only the first 8 chars of the token):
   ```
   source ~/.zprofile && echo "account: ${CLOUDFLARE_ACCOUNT_ID:0:8}… token: ${CLOUDFLARE_API_TOKEN:+set (${#CLOUDFLARE_API_TOKEN} chars)}"
   ```

2. **Install deps if missing** — `node_modules/.bin/vite` absent means run `npm ci`. Use the alt cache flag if npm complains about root-owned cache:
   ```
   npm ci --cache /tmp/npm-cache-hcm
   ```

3. **Build**:
   ```
   npm run build
   ```
   Output goes to `./dist` — which `wrangler.jsonc` serves as static assets.

4. **Deploy** — always via `npm run deploy`, never raw `wrangler deploy`. The npm script fires a `predeploy` hook that aborts if `FREEZE.md` exists, which is the only enforcement against accidentally publishing over a frozen version:
   ```
   source ~/.zprofile && npm_config_cache=/tmp/npm-cache-hcm npm run deploy
   ```
   Wrangler is now a devDependency, so `npm run deploy` resolves it locally — no `npx` fetch needed.

5. **Report back** the deploy URL (e.g. `https://hope-citizen-manual.noodl-api.workers.dev`) and the Version ID from wrangler's output.

## Known gotchas

- **Root-owned npm cache** at `~/.npm/_cacache` breaks plain `npm`/`npx`. Workaround: `npm_config_cache=/tmp/npm-cache-hcm`. Permanent fix: `sudo chown -R 501:20 ~/.npm` (requires user to run).
- **macOS 13.4 warning** from wrangler about runtime compatibility is noise — deploys still succeed.
- **"No updated asset files to upload"** is not a failure — it means `dist/` content is unchanged since the last deploy, only the worker metadata refreshes.
- **Custom domain** (Porkbun-purchased, Cloudflare-hosted) is bound via Cloudflare dashboard → Workers → `hope-citizen-manual` → Settings → Triggers → Custom Domains. Not managed from this repo. If the domain isn't resolving after deploy, check that binding in the dashboard.

## Do not

- Do not add `CLOUDFLARE_*` secrets to GitHub Actions or commit them anywhere. User has explicitly opted out of CI deploys — deploys are manual from this machine only.
- Do not run `wrangler login` — API token auth is already configured via env vars.
- Do not modify `wrangler.jsonc` as part of a deploy.
- Do not write the token to any file in the repo.
- Do not invoke `wrangler deploy` directly (raw or via `npx`). The freeze guard is wired through the `predeploy` npm hook; raw wrangler bypasses it. Always go through `npm run deploy`.
- Do not run `wrangler deploy` immediately after `wrangler rollback`. The rollback already promotes a prior version to 100% — a follow-up deploy of the current `dist/` will overwrite the rollback with whatever your working tree contains. This exact pattern caused the May 3 → May 11 re-freeze incident.
- Do not delete `FREEZE.md` casually. Treat it as a production lock; confirm with the user before removing.
