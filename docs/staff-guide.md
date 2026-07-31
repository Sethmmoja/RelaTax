# RelaTax Staff Guide

_For RelaTax staff (admin/finance/accountant/tax-consultant/support roles) using the Admin Portal and handling WhatsApp escalations. Written from the features actually built in this codebase — screen names and actions below match what you'll see._

## Signing in

Go to the Admin Portal (a separate app/URL from the client portal — ask your team lead for the address if you don't have it). Use the email/password your account was created with. If you don't have an account yet, a Super Admin or Admin creates it under **Users**.

## Your account settings

Every staff account can, from the client-portal-style **Settings** area (same account settings surface clients use):
- **Resend verification email** if your email isn't verified yet.
- **Turn on two-factor authentication (MFA)** — you'll verify a phone number via a one-time code, then every future login asks for a fresh code from that phone in addition to your password. Turning it off requires re-entering your password.
- **View and sign out active sessions** — every device you've logged in from is listed with when it was last active; use "Sign out" on any device you don't recognize or no longer use.

## Managing businesses

**Businesses** page:
- **New business requests** come in from clients using the portal's "Add Business" button, or from the public website's consultation request form. Review and approve/archive them here.
- **Create a business** directly, set its name, logo, and brand color (shown to that business's users throughout the portal and WhatsApp).
- **Business members** — add or remove which client users belong to a business (controls what they can see in the portal and via WhatsApp).
- **QuickBooks** — connect a business's QuickBooks Online account, trigger a manual sync, and view sync history/errors in the sync log.
- **Cloud Drive** — connect a business's Google Drive (a folder named "RelaTax Reports" in their Drive), trigger an import, and view import history. Imported files are automatically categorized (P&L, balance sheet, VAT return, bank statement, etc.) from their filename.

## Documents

**Documents** page: upload a file directly to a business, tagging its category, report type, and reporting period. The client sees it immediately in their portal and gets a notification. Accepted file types: PDF, Excel (.xls/.xlsx), Word (.doc/.docx), and images (JPEG/PNG) — up to 25MB. Anything else is rejected.

## Knowledge Base (powers the AI assistant)

**Knowledge Base** page: author and edit the articles the AI assistant (on the website, in the portal, and on WhatsApp) draws its answers from. The assistant **only** answers from what's here plus a client's own numbers — it will never invent an answer, and says so plainly when it doesn't have grounded information, offering to connect the client with you instead. Keep articles accurate and current: anything wrong here can surface as a wrong answer to a client.

## Staff & roles

**Users** page (Super Admin/Admin only): create staff accounts and assign one of the 7 roles, which controls what that person can see and do across the Admin Portal. See [roles-permissions-matrix.md](architecture/roles-permissions-matrix.md) for exactly what each role can access.

## Notifications

**Notifications** page: compose a notification to a specific client, a whole business, or broadcast to all staff. Clients see these in their portal and can also receive them over WhatsApp.

## Audit log

**Audit Log** page: every write action (uploads, downloads, role changes, business edits, sync triggers) is recorded here automatically, filterable by entity type and date range. This is permanent and cannot be deleted through the app — use it to answer "who did what, when" questions, including for compliance requests.

## Job/queue health

If something seems stuck (a document import, a QuickBooks sync, a scheduled notification), `/admin/queues` (a separate URL from the main Admin Portal, password-protected — ask your team lead for credentials) shows real-time job counts and failures for every background job in the system, without needing a developer.

## Handling WhatsApp escalations

The WhatsApp assistant handles most client requests itself (checking reports, taxes, documents, asking the AI questions), but it hands off to a human in three ways:
1. **Automatically**, when the AI doesn't have a confident, grounded answer to a client's question.
2. **"Chat with a consultant"** — the client picks this from the menu, or types "talk to a human" at any point.
3. **"Book a consultation"** or **"Schedule a callback"** — the client requests a specific follow-up.

All three notify the business's assigned staff member (or the relevant team, depending on how it's configured) — check **Notifications** for these alerts. When you pick up an escalation, reach out to the client directly (their WhatsApp number and business are included in the alert); there's currently no in-app reply-to-WhatsApp thread, so you respond via your own WhatsApp Business number or a call, per your team's usual process.

## Things staff should never do

- Don't share your login or 2FA device with anyone else — the audit log attributes every action to your account specifically.
- Don't upload a client's document to the wrong business — always double-check the business selector before uploading.
- Don't edit Knowledge Base articles with guesses or unverified figures — the AI treats everything here as ground truth for every client that sees it.
