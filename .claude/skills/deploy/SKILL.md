---
name: deploy
description: Build and deploy hope-citizen-manual to Cloudflare Workers. Use when the user asks to deploy, ship, publish, push live, or release the site.
---

# Deploy hope-citizen-manual to Cloudflare

This project is served as a Cloudflare Worker with static assets. Worker name: `hope-citizen-manual` (see `wrangler.jsonc`). SPA routing is built in.

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

4. **Deploy**. Wrangler isn't in `package.json`, so `npx` fetches it. Use the alt cache to dodge the root-owned `~/.npm` issue:
   ```
   source ~/.zprofile && npm_config_cache=/tmp/npm-cache-hcm npx wrangler deploy
   ```

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
