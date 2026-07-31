# Roles & Permissions Matrix

Roles are rows in the `Role` table; permissions are granted per-role via `RolePermission`. Guards read this at request time (`@Roles(...)` / `@Permissions(...)` decorators on controllers), so changing a role's grants is a data change, not a code change.

| Permission → / Role ↓ | View | Create | Edit | Delete | Upload | Download | Approve | Manage Users |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (except Super Admin) |
| **Finance** | ✅ | ✅ | ✅ | ⛔ | ✅ | ✅ | ✅ | ⛔ |
| **Accountant** | ✅ | ✅ | ✅ | ⛔ | ✅ | ✅ | ⛔ | ⛔ |
| **Tax Consultant** | ✅ (tax/reports only) | ✅ (tax records) | ✅ (tax records) | ⛔ | ✅ (tax docs) | ✅ | ⛔ | ⛔ |
| **Support** | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ⛔ | ⛔ |
| **Read Only** | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ⛔ | ⛔ |

Clients authenticated through the portal or WhatsApp are not assigned an admin `Role` — they are scoped entirely by `BusinessMember` rows: a client can only ever `View`/`Download` data for businesses they're a member of, and can `Create` only a `BusinessRequest` (never a `Business` directly — see the [Add Business flow](ux-flows.md#add-business)).

## Enforcement points

- **`RolesGuard`** — blocks a controller method unless the caller's role is in the allow-list.
- **`PermissionsGuard`** — finer-grained: checks the specific permission (e.g. `documents:approve`) against the caller's role's `RolePermission` rows, so new permissions can be added without touching guard code.
- **Ownership/scope check** — for client-facing endpoints, a second check (not a role check) verifies the caller has a `BusinessMember` row for the `businessId` in the request path, independent of any admin role.
- **Audit** — every `Create`/`Edit`/`Delete`/`Upload`/`Approve`/`Manage Users` action is written to `AuditLog` by the interceptor, regardless of which role performed it.

## Role summaries

- **Super Admin** — full system control, including managing other admins' roles. Reserved for RelaTax leadership.
- **Admin** — day-to-day platform operations: business lifecycle, user management (excluding Super Admins), all document/report/notification actions.
- **Finance** — approves and manages financial data across clients; cannot delete records (append/correct only, preserving audit trail) or manage users.
- **Accountant** — prepares and uploads reports/documents for assigned businesses; cannot approve their own submissions or manage users.
- **Tax Consultant** — scoped to tax records and tax-related documents only; cannot touch general financial statements outside tax context.
- **Support** — read/download access to help answer client questions; no write access to financial data.
- **Read Only** — audit/observer access, e.g. for external auditors or new hires in onboarding.
