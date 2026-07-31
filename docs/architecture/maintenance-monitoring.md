# Maintenance & Monitoring Plan

_Last updated: 2026-07-24 — Phase 4 items below are implemented and live-verified, not just planned._

## Health checks

`GET /health` (public) checks live Postgres (`SELECT 1`) and Redis (`PING`) connectivity and returns `200` when both are healthy or `503` if either is down — point a load balancer or uptime monitor at it. Implementation: [`apps/api/src/health`](../../apps/api/src/health).

## Logging & error tracking

Every exception is now logged server-side by `HttpExceptionFilter` (previously it formatted the client response but logged nothing — 500s were silent). 5xx errors log the full stack at `error` level and are forwarded to Sentry when configured; 4xx are logged at `warn` without stack noise. Sentry is a swappable seam like the AI/Email/Drive integrations: set `SENTRY_DSN` to enable it, otherwise errors still land in stdout with full stack traces — local dev needs no account. Implementation: [`apps/api/src/monitoring/sentry.ts`](../../apps/api/src/monitoring/sentry.ts), [`http-exception.filter.ts`](../../apps/api/src/common/filters/http-exception.filter.ts).

Frontend error-boundary reporting is not yet implemented (still a gap).

## Sync & queue dashboards

Bull Board is mounted at `/admin/queues`, covering the three real queues (`cloud-drive-import`, `quickbooks-sync`, `notifications`), behind HTTP Basic Auth (`BULL_BOARD_USER`/`BULL_BOARD_PASS` — change these before deploying anywhere reachable outside your own machine). Live-verified: shows real per-queue job counts. Implementation: [`apps/api/src/monitoring/queue-dashboard.ts`](../../apps/api/src/monitoring/queue-dashboard.ts).

## Load testing

`pnpm --filter api load-test` (script: [`scripts/load-test.ts`](../../apps/api/scripts/load-test.ts)) runs [autocannon](https://github.com/mcollina/autocannon) against the two endpoints most likely to bottleneck: report export (CPU-bound PDF rendering) and the WhatsApp webhook path (conversation engine + DB round trips). A real run against the local dev server (10 connections, 12s) produced:

| Endpoint | Requests/sec | Latency avg / p99 | Errors |
|---|---|---|---|
| Report export (PDF, pdfkit) | ~39/sec | 254ms / 1036ms | 0 |
| WhatsApp simulate-inbound | ~288/sec | 34ms / 89ms | 3 non-2xx out of 3454 (no corresponding server-side error logged — unresolved minor observation, not reproduced on follow-up) |

Report rendering is the clear bottleneck relative to the conversation engine, as expected for CPU-bound PDF generation — worth revisiting with response caching (a report's content doesn't change between requests) if export volume grows.

## Alerting thresholds

Thresholds below are the target policy for a real alerting stack (PagerDuty/Opsgenie + a metrics backend) — not yet wired up, since that requires an account with a specific provider. Sentry (once configured) already covers the "API 5xx" row from day one.

| Signal | Threshold | Action |
|---|---|---|
| API 5xx rate | >1% over 5 min | Page on-call |
| QuickBooks sync failures | 2 consecutive failed runs for a business | Notify admin, surface in sync log UI |
| WhatsApp webhook errors | Any signature-verification failure spike | Page on-call (possible spoofing attempt) |
| Queue backlog | >500 waiting jobs on any queue | Notify on-call, consider scaling workers (visible today in Bull Board) |
| DB connection pool exhaustion | >80% utilization | Notify on-call |

## Backups & recovery

Implemented and drilled for real against the local Docker stack (not just documented as a future plan):

- **Backup** — `infra/scripts/backup.sh` runs `pg_dump` inside the Postgres container (a live logical dump, no downtime) and backs up every object in the documents bucket via the real S3 API (`scripts/backup-documents.ts` — deliberately *not* a filesystem copy of MinIO's data directory, which wraps/inlines object bytes inside its own internal format and isn't portable).
- **Restore drill** — `infra/scripts/restore-drill.sh <timestamp>` restores the Postgres dump into a scratch database and compares row counts against the live DB table-by-table, then restores every backed-up document into a fresh scratch bucket via the S3 API and hash-compares each one byte-for-byte against the original, cleaning up afterward.
- **Real drill result**: all 7 checked tables matched (including 4,052 audit log rows), and all 13 documents restored and verified byte-identical.
- In production this maps to: automated daily managed-Postgres snapshots with point-in-time recovery, object storage versioning on the documents bucket, and this same drill run quarterly against a scratch environment.

## Ongoing maintenance

- Dependency updates reviewed monthly (security patches applied immediately, following the audit gate in CI).
- Audit log retention policy defined per compliance requirements (default: indefinite, exportable, never deletable via the API).
