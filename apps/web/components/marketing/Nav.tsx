"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { gsap, useGSAP, Button } from "@relatax/ui";
import { Logo } from "../Logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!menuRef.current) return;
      gsap.to(menuRef.current, {
        height: menuOpen ? "auto" : 0,
        opacity: menuOpen ? 1 : 0,
        duration: menuOpen ? 0.3 : 0.25,
        ease: menuOpen ? "power2.out" : "power2.in"
      });
    },
    { dependencies: [menuOpen] }
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center" onClick={() => setMenuOpen(false)}>
          <Logo className="h-7 w-auto sm:h-8" />
        </Link>

        <nav className="hidden flex-wrap items-center gap-6 text-sm text-foreground/70 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-medium hover:text-primary sm:inline">
            Login
          </Link>
          <Link href="/contact#tell-us-about-your-business">
            <Button size="sm">Book a consult</Button>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded border border-border text-foreground lg:hidden"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <nav
        ref={menuRef}
        inert={!menuOpen}
        style={{ height: 0, opacity: 0 }}
        className="overflow-hidden bg-background lg:hidden"
      >
        <ul className="flex flex-col gap-1 border-t border-border px-6 py-4 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded px-2 py-2 text-foreground/80 hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block rounded px-2 py-2 text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              Login
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
