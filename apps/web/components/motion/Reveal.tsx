"use client";

import { createElement, ReactNode, useRef } from "react";
import { gsap, useGSAP } from "@relatax/ui";

interface RevealProps {
  children: ReactNode;
  /** Stagger children of this element instead of animating it as one block — pass a CSS selector for the items. */
  stagger?: string;
  delay?: number;
  className?: string;
  as?: "div" | "section";
}

/**
 * Fades + lifts content in as it scrolls into view — the one consistent
 * motion language used across the whole marketing site. Deliberately plain:
 * the signature moment is the homepage hero and the stamp badges, not this.
 */
export function Reveal({ children, stagger, delay = 0, className, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const targets = stagger ? el.querySelectorAll(stagger) : el;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(targets, { opacity: 0, y: 24 });
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: stagger ? 0.08 : 0,
          delay,
          scrollTrigger: { trigger: el, start: "top 85%", once: true }
        });
      });

      return () => mm.revert();
    },
    { dependencies: [stagger, delay], scope: ref }
  );

  return createElement(as, { ref, className }, children);
}
