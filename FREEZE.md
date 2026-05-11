# Production Deploy FREEZE

**Status:** ACTIVE
**Locked version:** `1dd9dc76-0d01-454a-8f73-622cba9c3d5f`
**Snapshot:** Cloudflare Worker deploy from 2026-05-03 21:50 EDT
**Domains affected:** `watchlight.info`, `control.watchlight.info`, `report.watchlight.info`
**Frozen on:** 2026-05-11

While this file exists at the repo root, `npm run deploy` will refuse to publish
a new version (see the `predeploy` script in `package.json`). The GitHub Actions
auto-deploy workflow (`.github/workflows/deploy.yml`) was also removed on
2026-05-11; there is no automated publishing path.

## To unfreeze (intentional production change)

1. Confirm with the owner that the May 3 snapshot should be replaced.
2. `rm FREEZE.md`
3. `git commit -am "Unfreeze production deploys"`
4. `git push`
5. `npm run deploy`

## Bypass warning

The `predeploy` npm hook only fires when deploy goes through `npm run deploy`.
A direct `wrangler deploy` (or `npx wrangler deploy`) bypasses this guard. The
deploy skill at `.claude/skills/deploy/SKILL.md` mandates the `npm run deploy`
path; do not invoke raw `wrangler deploy` while this freeze is in effect.

## Why the freeze exists

A `wrangler rollback` to `1dd9dc76` at 2026-05-11 15:46 UTC was overwritten 1m40s
later by a stray `wrangler deploy` of the local `dist/` (which built from
post-May-3 source). This guard prevents the same accidental-overwrite pattern.
