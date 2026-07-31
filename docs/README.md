# RelaTax Platform — Architecture Documentation

RelaTax is one backend powering four connected surfaces: the public website, the client portal, the admin portal, and a WhatsApp AI assistant that functions as a full conversational client portal. This directory is the architecture record for that system, written before (and alongside) the Phase 1 implementation in `apps/` and `packages/`.

## Contents

1. [System Architecture](architecture/system-architecture.md) — the 4-surface / 1-backend design, module boundaries, tech stack rationale.
2. [Entity-Relationship Diagram](architecture/erd.md) — the full data model (source of truth: `apps/api/prisma/schema.prisma`).
3. [API Design](architecture/api-design.md) — REST resource map, conventions, key contracts.
4. [Roles & Permissions Matrix](architecture/roles-permissions-matrix.md) — the 7 roles and their capability grants.
5. [UX Flows](architecture/ux-flows.md) — onboarding, add-business, reports, notifications, compared across surfaces.
6. [QuickBooks Integration](architecture/quickbooks-integration.md) — OAuth2, sync design, conflict resolution, known API limitations.
7. [WhatsApp Conversation Flows](architecture/whatsapp-flows.md) — auth, menu, and task flows as List Message / Reply Button sequences.
8. [AI / RAG Architecture](architecture/ai-rag-architecture.md) — ingestion, retrieval, grounded generation, per-surface guardrails.
9. [Security Architecture](architecture/security-architecture.md) — authn/authz, encryption, secrets, rate limiting, audit, OWASP mapping.
10. [Roadmap](architecture/roadmap.md) — phased delivery plan.
11. [Testing Strategy](architecture/testing-strategy.md) — unit, integration, component, e2e, and conversation-engine testing.
12. [Deployment Strategy](architecture/deployment-strategy.md) — environments, containers, cloud topology.
13. [Maintenance & Monitoring](architecture/maintenance-monitoring.md) — logging, alerting, backups, on-call.
14. [Staff Guide](staff-guide.md) — how RelaTax staff use the Admin Portal day-to-day, and how WhatsApp escalations get handled.

## Current phase

**Phase 1 (this repo state):** monorepo scaffold, full data model, working auth/RBAC, core backend modules, a functioning WhatsApp conversation engine running against a mock transport, a functioning RAG pipeline running against a seeded knowledge base, and three working frontends (marketing site, client portal, admin portal) against seeded data. QuickBooks OAuth is scaffolded with a mock connector; the real Intuit API call and the real WhatsApp Cloud API / LLM calls are the explicit Phase 2 swap points — see the [Roadmap](architecture/roadmap.md).
