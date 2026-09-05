import type { Metadata } from "next";

/**
 * Server layout wrapping the whole (admin) route group. Its only job is to
 * carry metadata: the layout inside it is a client component, and Next only
 * reads a `metadata` export from server components.
 *
 * Staff tooling over every client's financial data — it must never be indexed.
 * robots.txt already disallows these paths; this is the second layer, and the
 * one that still applies if a URL is reached directly or linked from elsewhere.
 */
export const metadata: Metadata = {
  // Without this, every admin tab inherits the marketing tagline and a user
  // with several open can't tell them apart. Pages inside may override the
  // title; those that don't get this instead of "Fractional Accounting…".
  title: {
    default: "Admin",
    template: "%s | RelaTax Admin"
  },
  robots: { index: false, follow: false, nocache: true }
};

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
