"use client";

import { ReactNode, useRef } from "react";
import { gsap, useGSAP } from "@relatax/ui";

/**
 * The connective tissue between the cinematic scene beats (Hero, StampImpact)
 * and the rest of the page's content. Rather than a flat fade, the wrapped
 * block arrives like the next page in the stack — receded and tilted back
 * in Z, settling flat as it's scrolled into place. Used once, around the
 * content that follows StampImpact; the content-list sections inside
 * (services grid, stats, etc.) keep their own `Reveal` stagger — this is
 * scene-level depth, not a per-item effect.
 */
export function LedgerPageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(el, { transformPerspective: 1400, z: -140, rotateX: 6, opacity: 0.4 });
        gsap.to(el, {
          z: 0,
          rotateX: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top 45%", scrub: 0.6 }
        });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className="preserve-3d">
      {children}
    </div>
  );
}
