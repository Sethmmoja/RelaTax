# Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Jest (`apps/api`) | Services in isolation — RBAC guard logic, tax calculation helpers, the WhatsApp conversation engine's state transitions (given state X + input Y → state Z + expected outbound message), the RAG retrieval scoring |
| Integration | Jest + Supertest + a real test database | Controller → service → Prisma round-trips against a disposable Postgres (migrated fresh per test run), including permission-denied paths |
| Component | Vitest + React Testing Library (`apps/web`) | Business switcher, report filter form, notification list, dark/light toggle |
| End-to-end | Playwright | Golden paths: client login → switch business → filter+download a report; admin login → approve a business request → upload a document → send a notification → see it in the audit log |
| Conversation engine | Jest, driving the engine directly (no real WhatsApp needed) | Full scripted conversations: OTP login → main menu → reports → date range → report type → document sent; escalation triggers when retrieval confidence is low |
| Contract | Shared `packages/types` + generated OpenAPI client | Ensures `apps/web` never drifts from `apps/api`'s actual DTO shapes — a breaking API change fails typecheck, not silently at runtime |

## Test data

Every layer above runs against the same seed fixtures used for local dev (`apps/api/prisma/seed.ts`), so a failing e2e test reproduces with `pnpm db:seed` + the same UI steps a human would take.

## CI gates

`pnpm turbo run lint typecheck test build` must pass before merge. E2E (Playwright) runs against a docker-compose'd stack in CI, not against production or staging.
