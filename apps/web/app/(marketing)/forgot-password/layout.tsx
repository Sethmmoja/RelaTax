import { pageMetadata } from "../../../lib/seo";

// This page is a client component, which cannot export `metadata` itself —
// Next only reads that export from server components, so it lives in the
// route's layout instead.
export const metadata = pageMetadata({
  title: "Reset Your Password",
  description:
    "Request a password reset link for your RelaTax account.",
  path: "/forgot-password",
  noIndex: true
});

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
