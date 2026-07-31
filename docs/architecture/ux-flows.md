# UX Flows

## Add Business

The client never creates a business directly — this is intentional (RelaTax staff must review and provision each business).

```mermaid
sequenceDiagram
    participant C as Client (Portal or WhatsApp)
    participant API as Backend
    participant A as Admin

    C->>API: Click "Add Business" / WhatsApp "Add Business"
    API->>API: Create BusinessRequest (status=pending)
    API->>A: Notify admin (new business request)
    A->>API: Review, POST /admin/businesses (creates Business, links request)
    API->>C: Notify client — business created
    C->>API: Business now appears in "My Businesses"
```

## Report retrieval — compared across surfaces

```mermaid
flowchart LR
    subgraph Portal
        P1[Reports page] --> P2[Filter: date/type] --> P3[Table + Download PDF/Excel]
    end
    subgraph WhatsApp
        W1[Main Menu → Reports] --> W2[Select Business] --> W3[Select Date Range] --> W4[Select Report Type] --> W5[PDF/Excel sent in chat]
    end
    subgraph Backend
        B[/GET businesses/:id/reports/]
    end
    P2 --> B
    W4 --> B
```

Both paths call the identical `ReportsService.findReports(businessId, filters)` — the portal renders it as a table, WhatsApp renders it as a document message. Same data, same permissions, same source.

## Notification lifecycle

```mermaid
sequenceDiagram
    participant Admin
    participant API as Backend
    participant Q as Queue (BullMQ)
    participant Portal
    participant WA as WhatsApp
    participant Email

    Admin->>API: Send/schedule notification (reminder, announcement, completion)
    API->>API: Persist Notification row
    API->>Q: Enqueue delivery job(s)
    Q->>Portal: In-app notification (read/unread)
    Q->>WA: WhatsApp message (if opted in / session active)
    Q->>Email: Email (if configured)
```

Delivery channels are independent queue jobs so a WhatsApp send failure (e.g. session expired) doesn't block the portal or email delivery — each retries on its own backoff, logged individually.

## Client onboarding (first login)

1. Admin creates the client's first `Business` (via the Add Business flow above, or direct admin creation for a new engagement).
2. Client receives an invite email with a set-password link.
3. Client logs in → sees their one business, no switcher needed yet.
4. Dashboard shows empty states with clear next actions ("No documents yet — your accountant will upload your first report shortly") rather than blank tables.
5. As soon as a second business is approved, the business switcher appears automatically — no separate "enable multi-business" step.

## WhatsApp-specific flows

See [WhatsApp Conversation Flows](whatsapp-flows.md) for the full authenticated menu system, which mirrors the portal's information architecture (Businesses → Reports/Taxes/Invoices/Receipts/Notifications/Documents/AI/Consultation) but expressed as List Messages and Reply Buttons instead of pages.
