"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { gsap, useGSAP, Flip } from "@relatax/ui";

interface NavItem {
  href: string;
  label: string;
}

/**
 * Sidebar nav with a sliding active-state pill (GSAP Flip) instead of a
 * hard class swap — the highlight glides between links as you navigate,
 * rather than jumping.
 */
export function SidebarNav({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const mountedRef = useRef(false);

  useGSAP(
    () => {
      const container = containerRef.current;
      const indicator = indicatorRef.current;
      if (!container || !indicator) return;

      // Positions the indicator to match the active link's current box —
      // called on navigation, and again on any layout shift (font load,
      // resize) via the ResizeObserver below, so it can never go stale.
      const place = (animate: boolean) => {
        const activeItem = itemRefs.current.get(pathname);
        if (!activeItem) {
          gsap.set(indicator, { width: 0, height: 0 });
          return;
        }

        const containerBox = container.getBoundingClientRect();
        const itemBox = activeItem.getBoundingClientRect();
        const target = {
          top: itemBox.top - containerBox.top,
          left: itemBox.left - containerBox.left,
          width: itemBox.width,
          height: itemBox.height
        };

        if (!animate || !mountedRef.current) {
          gsap.set(indicator, target);
          mountedRef.current = true;
          return;
        }

        const state = Flip.getState(indicator);
        gsap.set(indicator, target);
        Flip.from(state, { duration: 0.4, ease: "power2.inOut" });
      };

      place(true);

      const resizeObserver = new ResizeObserver(() => place(false));
      resizeObserver.observe(container);
      itemRefs.current.forEach((el) => resizeObserver.observe(el));

      return () => {
        resizeObserver.disconnect();
        // Strict Mode's dev-only mount->cleanup->mount cycle must not leave this
        // ref "true" going into the real mount, or the real mount's first
        // placement mistakes itself for a navigation and animates in via Flip
        // instead of snapping instantly to position.
        mountedRef.current = false;
      };
    },
    { dependencies: [pathname], scope: containerRef }
  );

  // Opacity-only first-load entrance — independent of the Flip indicator
  // logic above (which measures position, not opacity), so the two effects
  // can't interfere with each other regardless of run order.
  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;
      const links = container.querySelectorAll("a");
      if (!links.length) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(links, { opacity: 0 });
        gsap.to(links, { opacity: 1, duration: 0.35, ease: "power2.out", stagger: 0.04 });
      });

      return () => mm.revert();
    },
    { dependencies: [], scope: containerRef }
  );

  return (
    <div ref={containerRef} className={`relative space-y-1 ${className ?? ""}`}>
      <span ref={indicatorRef} className="absolute left-0 top-0 z-0 rounded-lg bg-primary" style={{ width: 0, height: 0 }} aria-hidden />
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => {
              if (el) itemRefs.current.set(item.href, el);
            }}
            className={`relative z-10 block rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? "text-primary-foreground" : "text-foreground/80 hover:bg-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
