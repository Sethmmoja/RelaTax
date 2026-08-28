# Deployment Strategy

## Local development

`infra/docker-compose.yml` runs Postgres+pgvector, Redis, and MinIO. Each app runs natively via `pnpm dev` (Turborepo) for fast iteration — only stateful infra is containerized locally. `apps/api`'s `predev` hook starts those containers (and Docker Desktop itself) automatically, so `pnpm dev` is the only command needed.

## Production stack (single VPS)

`infra/docker-compose.prod.yml` runs the whole system on one box: Postgres+pgvector, Redis, the API, the web app, and Caddy terminating TLS. Object storage is **not** in it — production uses Cloudflare R2 via the same S3 API, configured through `STORAGE_*`.

```bash
cd infra
cp prod.env.example prod.env        # fill in — gitignored, never commit
# place the Cloudflare Origin Certificate pair at infra/certs/
#   origin.pem / origin-key.pem     (also gitignored)
docker compose --env-file prod.env -f docker-compose.prod.yml up -d --build

# Apply the schema. Note the explicit binary path and working directory:
# `npx prisma` does NOT work here — the Prisma CLI is installed under
# apps/api/node_modules, not the workspace root, so npx treats it as missing
# and hangs forever on an install confirmation prompt with no TTY attached.
docker compose --env-file prod.env -f docker-compose.prod.yml \
  exec -w /app/apps/api api ./node_modules/.bin/prisma migrate deploy
```

Deliberate choices worth knowing before changing anything here:

- **Postgres and Redis publish no ports.** They're reachable only on the internal compose network, so a misconfigured firewall still can't expose the database.
- **`NEXT_PUBLIC_API_URL` is a build argument, not a runtime variable.** Next.js inlines `NEXT_PUBLIC_*` into the browser bundle at build time — changing it requires `up -d --build`, not a restart. Without it the image bakes in the localhost fallback and every visitor's browser calls their own machine.
- **`TRUST_PROXY_HOPS=2`** (Cloudflare → Caddy → API). Rate limiting buckets by client IP; behind proxies, `req.ip` is the proxy's address unless Express is told how many hops to unwind, which would collapse every client into one bucket and make the per-IP login/OTP limits meaningless. It defaults to `0` so a directly-exposed API can't be fooled by a forged `X-Forwarded-For`.
- **Caddy serves Cloudflare Origin Certificates rather than Let's Encrypt.** With the domain proxied, ACME's HTTP challenge has to round-trip the proxy; an origin cert avoids that. Pair with Cloudflare SSL/TLS mode **Full (strict)** — "Flexible" leaves the Cloudflare→origin hop unencrypted.

## Environments

| Environment | Purpose | Promotion |
|---|---|---|
| Local | Developer machines | — |
| Staging | Pre-release validation, QA, demo | Auto-deploy on merge to `main` |
| Production | Live client traffic | Manual promotion from a tagged staging build |

## Containers & topology (target production)

- `apps/api` and `apps/web` each build to a Docker image (multi-stage: install → build → slim runtime). `apps/web` is the single frontend — marketing site, client portal, and admin experience all in one deployment, one login, routed by the signed-in user's role (client → `/portal/...`, staff → `/admin/...`).
- Managed Postgres with `pgvector` extension enabled (e.g. RDS/Aurora or a managed Postgres provider that supports the extension), managed Redis (ElastiCache or equivalent), S3 for object storage.
- Container hosting (ECS/Fargate, Fly.io, or Render) behind a load balancer terminating TLS.
- BullMQ workers run as a separate deployment/process from the API's HTTP server, so a spike in QuickBooks sync or notification jobs never starves request-handling capacity.

## CI/CD

- GitHub Actions: on PR — lint/typecheck/test/build; on merge to `main` — build images, deploy to staging; production deploy is a manual gated promotion of a specific staging build/tag.
- Database migrations (`prisma migrate deploy`) run as a distinct pipeline step before the new app version receives traffic, with a documented rollback (`prisma migrate resolve`) procedure for the rare backward-incompatible migration.

## Configuration

All environment-specific values (DB URL, Redis URL, S3 bucket, Meta/Intuit/LLM credentials) are environment variables, validated at boot (fails fast, not at first use) — see `apps/api/src/config`.

## Docker images

_Implemented and verified — not just planned._ Each app has a multi-stage `Dockerfile` at its root using Turborepo's `prune --docker` pattern (prunes the monorepo to just that app's dependency subset before installing/building, so the final image only contains what it needs):

- `apps/api/Dockerfile` — installs deps, runs `prisma generate`, builds with `nest build`, ships a slim `node:24-alpine` runtime running as a non-root user. `EXPOSE 4000`.
- `apps/web/Dockerfile` — Next.js `output: "standalone"` build, copying only the standalone server + static assets + `public/` into the runtime stage. `EXPOSE 3000`.

Build from the **repo root** (the pruning step needs the full workspace as context):

```bash
docker build -f apps/api/Dockerfile -t relatax-api:<tag> .
docker build -f apps/web/Dockerfile -t relatax-web:<tag> .
```

Both were built and run locally against the real `infra/docker-compose.yml` stack as a smoke test: the API image passed `/health` (real Postgres+Redis checks) and a real login round-trip; the web image served the real homepage. This is the same verification to run in CI/CD before promoting an image, not just at build time.

## CI/CD (implemented)

`.github/workflows/ci.yml` runs on every PR and on push to `main`: install → `prisma generate` → `typecheck`/`build`/`test` (via Turborepo, so only affected packages rebuild) → `pnpm audit --prod --audit-level=high` (fails the build on any high/critical dependency vulnerability — see [security notes](#security-hardening-notes) below). This has not been run against a live GitHub Actions runner since the repo has no configured remote yet; the steps mirror exactly what was run and verified locally in this session.

`.github/workflows/release.yml` builds both production images and publishes them to GitHub Container Registry. It triggers on a **successful** CI run against `main` (a red build never produces a pullable tag) and can also be dispatched by hand with an extra version tag. Images are published as `ghcr.io/sethmmoja/relatax-{api,web}`, tagged `latest` and the exact commit SHA.

Two things about it are load-bearing:

- **It exists mainly so the VPS never builds.** A Next.js production build wants 2 GB+ on its own; on a 4 GB box, running it alongside Postgres and Redis can get OOM-killed mid-deploy. Set `API_IMAGE`/`WEB_IMAGE` in `prod.env` to the `ghcr.io` tags and deploy with `pull` + `up -d` instead of `up -d --build`.
- **The web build fails fast if `NEXT_PUBLIC_API_URL` is unset.** It's a repository *variable* (Settings → Secrets and variables → Actions → Variables), not a secret. Without the guard, an unset variable would fall through to the Dockerfile's localhost default and publish an image whose every API call points at the visitor's own machine — silently, since nothing errors at build time.

Still not automated: deploying to the server itself (pulling the new tag and restarting). That stays a manual step on the box for now, which is appropriate while there is a single unmanaged VPS and no staging environment to promote from.

## Cutover runbook

**Pre-cutover checklist:**
1. All required env vars set for the target environment (copy `apps/api/.env.example`, fill in real values — especially `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` with strong random values, never the `dev-*-change-me` defaults).
2. `SENTRY_DSN` set so errors are visible from minute one.
3. `BULL_BOARD_USER`/`BULL_BOARD_PASS` changed from the dev defaults.
4. Database reachable and `pgvector` extension available.
5. Run the [backup drill](maintenance-monitoring.md#backups--recovery) once against the target DB before real traffic touches it, to confirm backup tooling works there too.

**Cutover steps:**
```bash
# 1. Apply migrations (never `migrate dev` outside local development)
pnpm --filter @relatax/api prisma migrate deploy

# 2. Build & start the two images (or push to your registry and deploy however
#    your host expects — ECS/Fargate/Fly/Render all consume the same images)
docker build -f apps/api/Dockerfile -t relatax-api:<release-tag> .
docker build -f apps/web/Dockerfile -t relatax-web:<release-tag> .

# 3. Confirm health before routing real traffic
curl -f https://<api-host>/api/v1/health
```

**Staged rollout:** point a small number of pilot client accounts (portal logins) at the new environment first — the RBAC model already isolates data per business, so pilot and non-pilot businesses can coexist in the same database with zero cross-visibility risk. Expand to the full client book once the pilot period shows no error-rate increase in Sentry and no anomalies in Bull Board's queue metrics.

**Rollback plan:**
- **App-only issue** (bug in new code, DB schema unchanged): redeploy the previous image tag. No data changes to undo.
- **Migration involved**: if the migration was purely additive (new nullable column/table), rolling back the app code is safe without reverting the migration. If it was destructive (column drop/rename), restore from the pre-cutover backup into a scratch environment first and confirm before deciding whether to also roll back data — never run a destructive down-migration against production without a fresh verified backup in hand (see the [restore drill](maintenance-monitoring.md#backups--recovery)).
- **Total loss / corrupted data**: restore the latest verified backup following the same drill procedure already proven to work (`infra/scripts/restore-drill.sh`), pointed at the production backup instead of a local one.

## Security hardening notes

From the Phase 5 review of this codebase (fixed, not just noted):
- CORS restricted to `APP_URL` (was previously wide open).
- Rate limiting added globally (60 req/min/IP) with stricter limits on login/OTP/password-reset (5–10 req/min/IP).
- File uploads validated (25MB limit, MIME allowlist) and filenames sanitized before use in storage keys.
- Fixed two OAuth callback endpoints (cloud-drive, QuickBooks) that were returning live access/refresh tokens as plaintext JSON to an unauthenticated response.
- Fixed a broken-object-level-authorization bug: any authenticated user could mark any other user's notification as read.
- Dependency vulnerabilities reduced from 29 (10 high) to 6 (0 high/critical) via `pnpm-workspace.yaml` overrides — remaining 6 are moderate-severity, deep transitive dependencies of `bullmq`/`exceljs`/`@sentry/node` where forcing a version risks breaking compatibility for low marginal benefit; revisit when those libraries update naturally.
- **Not done, and requires your decision, not a default:** a genuine third-party penetration test. This session's review is a rigorous first-party pass, not a substitute for one before handling real client financial data at scale.
- **Operational requirement, not a code fix:** generate strong random values for `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` per environment — the schema only enforces a minimum length (10 chars), not complexity, since that's a deployment-time responsibility.
