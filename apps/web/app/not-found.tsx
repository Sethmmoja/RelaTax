import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@relatax/ui";
import { Logo } from "../components/Logo";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you were looking for doesn't exist or has moved.",
  // A 404 must never be indexed, or search engines list a dead end as a result.
  robots: { index: false, follow: true }
};

/**
 * Lives at the app root so it catches unmatched routes across the marketing
 * site, the client portal and the admin portal alike. It renders its own
 * header/footer rather than inheriting a route group's chrome, since an
 * unmatched URL belongs to no group.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <Link href="/" aria-label="RelaTax home">
          <Logo className="h-7 w-auto" />
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Error 404</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">This page doesn&apos;t exist.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          The link may be out of date, or the address mistyped. Nothing is wrong with your account — these are the
          pages people usually want.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/">
            <Button>Back to home</Button>
          </Link>
          <Link href="/contact#tell-us-about-your-business">
            <Button variant="outline">Talk to us</Button>
          </Link>
        </div>

        {/* Internal links from the 404 keep crawlers moving through the site
            instead of treating it as a dead end. */}
        <nav aria-label="Helpful links" className="mt-12 border-t border-border pt-8">
          <p className="mb-4 text-sm font-medium">Popular pages</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { href: "/services", label: "Services", hint: "Accounting, tax and payroll" },
              { href: "/resources", label: "Resources", hint: "Guides to Kenyan tax" },
              { href: "/about", label: "About RelaTax", hint: "Who we are" },
              { href: "/login", label: "Client portal", hint: "Sign in to your account" }
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="group block rounded-lg border border-border p-4 hover:border-primary">
                  <span className="font-medium group-hover:text-primary">{link.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{link.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
