import type { Metadata } from "next";

/**
 * Wraps the OAuth callback routes. These are machine endpoints — a browser
 * lands here for a moment while a token is exchanged, then gets redirected —
 * so they carry their own title instead of inheriting the site default, and
 * must never be indexed.
 *
 * The page inside is a client component, which cannot export `metadata`
 * itself, so it lives here.
 */
export const metadata: Metadata = {
  title: "Signing you in",
  robots: { index: false, follow: false, nocache: true }
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
