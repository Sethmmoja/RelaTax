import type { Metadata } from "next";

/**
 * Server layout wrapping the whole (portal) route group. Its only job is to
 * carry metadata: the layout inside it is a client component, and Next only
 * reads a `metadata` export from server components.
 *
 * Everything here sits behind authentication and shows client financial data,
 * so it must never be indexed. robots.txt already disallows these paths; this
 * is the second layer, and the one that still applies if a URL is reached
 * directly or linked from somewhere else.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true }
};

export default function PortalGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
