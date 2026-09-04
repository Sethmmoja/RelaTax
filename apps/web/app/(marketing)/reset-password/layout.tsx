import { pageMetadata } from "../../../lib/seo";

// This page is a client component, which cannot export `metadata` itself —
// Next only reads that export from server components, so it lives in the
// route's layout instead.
export const metadata = pageMetadata({
  title: "Set a New Password",
  description:
    "Choose a new password for your RelaTax account.",
  path: "/reset-password",
  noIndex: true
});

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
