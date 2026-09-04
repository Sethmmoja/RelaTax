import { pageMetadata } from "../../../lib/seo";

// This page is a client component, which cannot export `metadata` itself —
// Next only reads that export from server components, so it lives in the
// route's layout instead.
export const metadata = pageMetadata({
  title: "Verify Your Email",
  description:
    "Confirm your email address to activate your RelaTax account.",
  path: "/verify-email",
  noIndex: true
});

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
