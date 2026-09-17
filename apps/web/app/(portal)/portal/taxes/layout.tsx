import type { Metadata } from "next";

// The page is a client component, so its title lives here — the group
// layout's template appends the portal name.
export const metadata: Metadata = { title: "Taxes" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
