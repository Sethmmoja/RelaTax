"use client";

import { ReactNode, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP } from "@relatax/ui";

/**
 * Chrome-level route settle: a fast fade+lift on the content area when the
 * user navigates, never on first paint. Deliberately plain and short — this
 * is not a scene transition and must never block reading a table or filling
 * a form.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const prevPathnameRef = useRef<string | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const isRealNavigation = prevPathnameRef.current !== null && prevPathnameRef.current !== pathname;
      prevPathnameRef.current = pathname;
      if (!isRealNavigation) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(el, { opacity: 0, y: 10 });
        gsap.to(el, { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" });
      });

      return () => mm.revert();
    },
    { dependencies: [pathname], scope: ref }
  );

  return <div ref={ref}>{children}</div>;
}
