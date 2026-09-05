import { pageMetadata } from "../../../lib/seo";

// This page is a client component, which cannot export `metadata` itself —
// Next only reads that export from server components, so it lives in the
// route's layout instead.
export const metadata = pageMetadata({
  title: "Sign In",
  description:
    "Sign in to the RelaTax client portal to view reports, tax filings, invoices and payroll documents.",
  path: "/login",
  noIndex: true
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
