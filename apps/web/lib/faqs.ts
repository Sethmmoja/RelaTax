/**
 * Shared by the contact page (which renders them) and its layout (which emits
 * the FAQPage structured data). Google requires the markup to match the
 * visible content, so both read this one list rather than keeping their own.
 */
export const faqs = [
  {
    q: "What is fractional accounting?",
    a: "You get senior accounting, tax and payroll expertise on a part-time basis — sized to your business's actual needs, instead of hiring a full-time finance team."
  },
  {
    q: "Can I access my reports on WhatsApp?",
    a: "Yes — once you're a client, our WhatsApp AI Assistant lets you pull reports, check tax balances, and download invoices/receipts directly from a chat, after verifying your identity."
  },
  {
    q: "Do you integrate with QuickBooks?",
    a: "Yes, we connect to your existing QuickBooks Online account and sync your financial data automatically into your RelaTax reports and dashboards."
  },
  {
    q: "Can one account manage multiple businesses?",
    a: "Yes — your client portal supports multiple businesses, each with its own dashboard, documents, and reports. New businesses are set up after a short consultation."
  },
  {
    q: "Is my financial data secure?",
    a: "Yes. All data is encrypted in transit and at rest, access is role-based, and every action is recorded in an audit log."
  }
] as const;
