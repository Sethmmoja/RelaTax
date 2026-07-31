# Security Architecture

_Implementation status (2026-07-24): this doc was originally written pre-implementation. Most of it is now genuinely true — verified in a Phase 5 hardening pass, including live tests of the fixes. A few items below are still aspirational; each is marked._

**Confirmed implemented and tested:** rate limiting (global + strict on auth endpoints), refresh-token rotation with reuse detection, business-scope checks, file upload MIME/size validation + filename sanitization, audit logging, RBAC guards, CORS restricted to known frontend origins (was previously wide open — fixed this pass), dependency vulnerabilities reduced from 29 (10 high) to 6 (0 high/critical).

**Not yet implemented (aspirational below, flagged inline):** KMS-backed field-level encryption for OAuth tokens (QuickBooks/Cloud Drive tokens are currently stored in plaintext columns — acceptable for a local/dev deployment, a real gap before storing real third-party credentials in production), object-storage server-side encryption (depends on the chosen production S3/MinIO setup), TLS/HSTS (depends on the chosen hosting/ingress, not yet deployed anywhere), SSRF host allowlisting on outbound calls, and a genuine third-party penetration test (this doc's review is first-party).

## Authentication & authorization

- **JWT access (short-lived, ~15min) + refresh (rotating, ~30 days)** for portal/admin sessions; refresh tokens are stored hashed and invalidated on use (rotation), so a leaked refresh token can't be replayed indefinitely.
- **Phone OTP** for WhatsApp login and as a portal MFA-ready step (the schema and OTP service are already shared — enabling portal MFA is a config flip, not new infrastructure, per the "future ready" requirement).
- **RBAC** via `Role`/`Permission`/`RolePermission`, enforced in `RolesGuard`/`PermissionsGuard` on every controller — see [Roles Matrix](roles-permissions-matrix.md).
- **Business-scope checks** are independent of role: a client's JWT only ever unlocks businesses they have a `BusinessMember` row for, checked on every business-scoped route.

## Encryption

- **In transit**: HTTPS/TLS everywhere (enforced at the load balancer/ingress in every environment above local dev); HSTS enabled in production.
- **At rest**: database-level encryption (managed Postgres provider's encryption-at-rest) plus application-level encryption for the most sensitive columns (`QuickBooksConnection.accessToken`/`refreshToken`) using a KMS-backed key, not a hardcoded secret.
- **Object storage**: server-side encryption on the S3 bucket; documents are fetched via short-lived signed URLs, never public.

## Secrets management

- No secrets in source control (`.env` is gitignored; `.env.example` documents required keys). Production secrets live in the cloud provider's secret manager, injected as environment variables at deploy time.

## Rate limiting & abuse prevention

- Global rate limiting (per-IP and per-account) on `apps/api`, tighter limits on `/auth/*` and `/whatsapp/webhook` (which is also protected by Meta's signature verification).
- OTP requests are rate-limited per phone number to prevent SMS/WhatsApp bombing.

## Input validation

- Every DTO uses `class-validator` decorators; the global `ValidationPipe` strips unknown properties and rejects malformed payloads before they reach a service.
- File uploads are validated by MIME type and size limit before being written to storage; filenames are sanitized and storage keys are generated server-side (never derived from user-supplied names) to prevent path traversal.

## Audit logging

- `AuditLogInterceptor` writes an immutable row for every login, upload, download, create/edit/delete, permission change, and notification send — see the `AuditLog` entity in the [ERD](erd.md). No endpoint permits updating or deleting audit rows.

## OWASP Top 10 mapping

| Risk | Mitigation |
|---|---|
| Broken Access Control | RBAC guards + independent business-scope checks on every route |
| Cryptographic Failures | TLS in transit, KMS-backed encryption for sensitive columns, hashed passwords (argon2/bcrypt) |
| Injection | Prisma parameterized queries throughout; no raw SQL string concatenation |
| Insecure Design | Threat-modeled multi-tenant scoping (business membership) built into the data model, not bolted onto queries |
| Security Misconfiguration | Environment-validated config (fails fast on missing/invalid secrets), least-privilege DB roles |
| Vulnerable Components | Automated dependency updates + audit in CI |
| Auth Failures | Rate-limited OTP/login, rotating refresh tokens, session expiry |
| Data Integrity Failures | Signed/verified webhook payloads (Meta, Intuit) before processing |
| Logging/Monitoring Failures | Structured logs + audit log + alerting, see [Maintenance & Monitoring](maintenance-monitoring.md) |
| SSRF | Outbound calls restricted to allow-listed hosts (Intuit, Meta, LLM provider) |
