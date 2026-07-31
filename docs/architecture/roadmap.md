# Phased Implementation Roadmap

_Last updated: 2026-07-24 (evening) — reflects actual repo state, not the original Phase 1 plan._

## Phase 1 — Foundation ✅ complete

- Monorepo (Next.js × 2 + NestJS + shared packages), Postgres/pgvector + Redis + object storage infra.
- Full data model (Prisma), auth + RBAC, audit logging.
- Core backend modules: users, businesses (+ add-business request flow), documents, reports, taxes, notifications.
- Working WhatsApp conversation engine (auth, main menu, business switching, reports/taxes/invoices/receipts/documents/notifications, AI assistant, escalation) against a **mock transport**.
- Working RAG pipeline (real pgvector retrieval + seeded KB) with template-grounded generation.
- QuickBooks OAuth scaffolding + mock connector/sync job.
- Cloud-drive (Google Drive/Dropbox) report ingestion against a mock connector.
- Three working frontends against seeded data: marketing site, client portal, admin portal, with the extracted RelaTax branding and light/dark mode.

## Phase 2 — Real integrations — 4 of 5 code-complete; only WhatsApp and Cloud Drive need a credential

- ✅ **AI generation** — `AiService` calls real Claude (`AnthropicAiService`, `@anthropic-ai/sdk`) behind the existing interface, selected via `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`. Retrieval still runs on pgvector with a local hash embedder — a true semantic-embeddings provider (Voyage/OpenAI) is a further, independent swap since Anthropic has no embeddings endpoint.
- ✅ **Real PDF/Excel report rendering** — `ReportRendererService` (pdfkit + exceljs) generates a real file for reports with no backing upload, pulling actual `TaxRecord` figures when the report type has synced tax data (never fabricates numbers). Verified end-to-end against seeded data: real PDF and XLSX files produced, uploaded, and downloaded via signed URL. No external account needed — fully live now.
- ✅ **Cloud Drive — LIVE** — `GoogleDriveConnector` (real Drive v3 API via `googleapis`) connected end-to-end against a real personal Google account: real OAuth consent completed, real folder ("RelaTax Reports") found, a real import job ran and returned `SUCCESS` (0 files, since the folder is currently empty — drop a file in to see a real import). Dropbox remains mock-only (same pattern, not yet built). During activation, a real security bug was found and fixed: the OAuth callback was returning live access/refresh tokens as plaintext JSON to an unauthenticated response — it now redirects the browser into the admin app instead and never exposes tokens client-side.
- ✅ **Email — LIVE** — `SmtpEmailService` (nodemailer) connected against real Gmail SMTP with an App Password; authentication confirmed (Gmail accepted the send with no auth error). Works with any SMTP provider with zero code changes.
- ✅ **WhatsApp (code)** — `MetaWhatsAppTransport` (real Graph API sends via fetch) + `X-Hub-Signature-256` webhook verification implemented behind the same `WhatsAppTransport` interface. **Intentionally left on mock** — Meta's developer platform was unresponsive when attempting activation; see [whatsapp-flows.md](whatsapp-flows.md#activation-real-meta-cloud-api) for the steps to finish this later.
- ⛔ **QuickBooks** — intentionally deferred, out of scope for now.

**Phase 2 status: effectively done.** AI, Cloud Drive, and Email are live against real accounts. WhatsApp is code-complete and deliberately paused (Meta access), QuickBooks is deliberately deferred. Nothing left in either is a coding task — both are pure activation steps whenever revisited.

## Phase 3 — Depth & polish — complete

- ✅ Admin RBAC UI (staff/role management), Knowledge Base authoring UI, business member management, audit log filters, QuickBooks admin UI, cloud-drive ingestion UI.
- ✅ Email verification flow and password reset exist end-to-end, plus a **resend-verification-email button** on the new portal Settings page (`/portal/settings`).
- ✅ **MFA** — reuses the existing phone-OTP infrastructure (`otp.service.ts`, shared with WhatsApp login) rather than building a parallel one. Settings page lets a client verify a phone via OTP to turn MFA on, and requires a password re-confirmation to turn it off. `POST /auth/login` now returns `{mfaRequired, phone}` instead of tokens when enabled, and the existing `/auth/otp/verify` endpoint completes the login — no new challenge-token type needed. Live-verified end-to-end: enable → login MFA challenge → OTP-complete → disable.
- ✅ **Session/device management** — new `UserSession` model tracks every login as a device session (user agent, created/last-used, revocable). Refresh tokens now rotate on every use and are hash-compared against the stored session, so a reused/stolen refresh token is detected and the session is killed. Revoking a session blocks its access token **immediately** (checked in `JwtStrategy` on every request), not just on next refresh — live-verified: revoke → same token → 401 on the very next call. Portal Settings page lists sessions with a "Sign out" action per device (current device excluded).
  - Known trade-off, stated plainly: tokens issued *before* this change have no session id and are honored unchecked until their natural expiry (access: 15 min, refresh: 30 days) — avoids invalidating everyone's existing login on deploy, at the cost of old tokens not being revocable. New logins are fully covered.

## Phase 4 — Reliability & operations — complete

- ✅ **Health checks** — `GET /health` checks live Postgres + Redis connectivity.
- ✅ **Error tracking** — every exception is now logged server-side with a full stack trace (previously silent for 500s); Sentry wired behind `SENTRY_DSN`, same swappable-provider pattern as AI/Email/Drive.
- ✅ **Sync/queue dashboards** — Bull Board at `/admin/queues` (Basic Auth), covering all 3 real queues, live-verified showing real job counts.
- ✅ **Load testing** — real autocannon run against report export and the WhatsApp webhook; results and one open minor finding recorded in [maintenance-monitoring.md](maintenance-monitoring.md#load-testing).
- ✅ **Backup/restore drill** — real `pg_dump` + S3-API document backup, then a real restore into scratch resources with row-count and byte-for-byte hash verification. Passed: all 7 tables matched, all 13 documents verified. Scripts: `infra/scripts/backup.sh` / `infra/scripts/restore-drill.sh`.
- ⛔ Alerting thresholds are defined (see the doc) but not wired to a paging provider — needs an account with one (PagerDuty/Opsgenie/etc.), a pure activation step once chosen.
- ⛔ Frontend error-boundary reporting not yet implemented.

## Phase 5 — Hardening & launch — mostly complete

- ✅ **First-party security review** — a thorough manual audit (the designated `/security-review` skill couldn't run — it diffs against a git remote, and this repo has none — so the review was done by hand instead, arguably covering more ground since almost everything is technically "pending" with only 1 commit in history). Real findings, fixed and live-verified: two OAuth callbacks (cloud-drive, QuickBooks) were leaking live access/refresh tokens as plaintext JSON; a broken-object-level-authorization bug let any user mark any other user's notification as read; file uploads had no size/MIME validation and used unsanitized filenames in storage keys (path-traversal risk); no rate limiting existed anywhere (brute-forceable login/OTP); CORS was wide open; an undocumented `PORTAL_URL` env var silently fell back to `localhost` in any environment that forgot to set it; dependency vulnerabilities went from 29 (10 high) to 6 (0 high/critical) via `pnpm-workspace.yaml` overrides. See [security-architecture.md](security-architecture.md) for the full status and what's still aspirational (KMS-backed token encryption, TLS/HSTS, a genuine *third-party* pen test — this was first-party).
- ✅ **Production Docker images** — multi-stage `Dockerfile`s for all 3 apps using Turborepo's prune pattern, built and run locally against the real `docker-compose` stack: API passed a real health check + login, web served its real homepage, admin correctly redirected to login. A real bug was caught this way (`turbo prune` doesn't carry the root `tsconfig.base.json` into the pruned build context) and fixed.
- ✅ **CI workflow** — `.github/workflows/ci.yml` (typecheck/build/test/audit on every PR). Not yet run on a live GitHub Actions runner since this repo has no remote configured — the steps mirror exactly what was run and verified locally.
- ✅ **Cutover, rollback, and staged-rollout runbook** — concrete, command-level, in [deployment-strategy.md](deployment-strategy.md#cutover-runbook).
- ✅ **Staff training guide** — [docs/staff-guide.md](../staff-guide.md), covering Admin Portal usage and WhatsApp escalation handling end to end.
- ⛔ **Genuine third-party penetration test** — cannot be done by an AI assistant; needs a licensed firm and is your decision on timing/vendor, not a default.

Each phase is independently shippable — Phase 1 is a fully functional, demoable system with mocked externals, not a partial build that requires later phases to run at all.
