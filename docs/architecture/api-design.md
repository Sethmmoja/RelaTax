# API Design

Single REST API (`apps/api`), versioned at `/api/v1`, documented live via Swagger at `/api/docs`. GraphQL is not used in Phase 1 — the resource shapes are simple enough that REST + typed DTOs (shared via `packages/types`) cover every surface without the added complexity of a GraphQL gateway; this can be revisited if the AI/reporting surfaces need heavier ad-hoc querying later.

## Conventions

- **Auth**: `Authorization: Bearer <jwt>` on every authenticated route. The WhatsApp webhook is the one exception — it authenticates via Meta's signature header, then resolves its own internal session/JWT for downstream service calls.
- **Scoping**: any route under `/businesses/:businessId/...` requires the caller to have a `BusinessMember` row for that `businessId` (checked in a guard, independent of role).
- **Pagination**: `?page=1&pageSize=25`, response envelope `{ data, page, pageSize, total }`.
- **Filtering**: reports/documents/notifications all accept `?from=&to=&type=&category=` — the same query shape is reused by the portal UI, the admin UI, and the WhatsApp reports flow (which just fills these params from menu selections instead of form fields).
- **Errors**: RFC 7807-style problem responses (`{ statusCode, message, error }`), consistent across all modules via a global exception filter.

## Resource map

| Resource | Routes | Notes |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/password-reset/*` | OTP endpoints are shared by portal MFA-lite and WhatsApp login |
| Users | `GET/POST/PATCH /users`, `GET /users/me` | Admin-only for list/create of staff users |
| Businesses | `GET /businesses` (mine), `GET /businesses/:id`, `POST /businesses/requests`, `POST /admin/businesses`, `PATCH /admin/businesses/:id/approve`, `PATCH /admin/businesses/:id/archive` | Client-facing create is always a *request*, never a direct create |
| Documents | `GET /businesses/:id/documents`, `POST /businesses/:id/documents`, `GET /documents/:id/download` | Upload assigns client/business/category/report-type/period per the Admin Portal spec |
| Reports | `GET /businesses/:id/reports?from=&to=&type=`, `GET /reports/:id/export?format=pdf\|xlsx` | Same endpoint backs portal Reports page and WhatsApp Reports flow |
| Taxes | `GET /businesses/:id/taxes?status=due\|paid\|outstanding\|penalty`, `GET /businesses/:id/taxes/history` | |
| Notifications | `GET /notifications`, `POST /admin/notifications` (send/schedule), `PATCH /notifications/:id/read` | Admin send fan-outs to portal + WhatsApp + email via the queue |
| Audit Log | `GET /admin/audit-log?actor=&entityType=&from=&to=` | Admin/Super Admin/Finance only |
| AI | `POST /ai/chat` (public, KB-scoped), `POST /businesses/:id/ai/chat` (authenticated, KB + business-scoped) | See [AI/RAG Architecture](ai-rag-architecture.md) |
| WhatsApp | `POST /whatsapp/webhook` (Meta), `POST /whatsapp/simulate-inbound` (Phase 1 dev-only, mock transport) | See [WhatsApp Flows](whatsapp-flows.md) |
| QuickBooks | `GET /businesses/:id/quickbooks/connect` (OAuth redirect), `GET /quickbooks/callback`, `POST /admin/businesses/:id/quickbooks/sync` | See [QuickBooks Integration](quickbooks-integration.md) |

## Example contract — Reports

```
GET /api/v1/businesses/{businessId}/reports?from=2026-01-01&to=2026-05-31&type=vat
Authorization: Bearer <jwt>

200 OK
{
  "data": [
    {
      "id": "rep_...",
      "type": "VAT",
      "period": { "label": "Jan–May 2026", "startDate": "2026-01-01", "endDate": "2026-05-31" },
      "source": "quickbooks",
      "document": { "id": "doc_...", "mimeType": "application/pdf", "sizeBytes": 84213 }
    }
  ],
  "page": 1,
  "pageSize": 25,
  "total": 1
}
```

This exact shape is what the WhatsApp conversation engine calls internally (as a service method, not an HTTP round-trip) after a user completes Reports → Business → Date Range → Report Type — guaranteeing the WhatsApp answer and the portal table never disagree.
