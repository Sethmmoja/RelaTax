"use client";

import { HTMLAttributes, useRef } from "react";
import { gsap, useGSAP } from "../lib/gsap";
import { cn } from "../lib/utils";

export type BadgeVariant = "default" | "success" | "warning" | "destructive" | "outline" | "stamp" | "stamp-destructive";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-accent text-accent-foreground rounded-pill px-3 py-1 text-xs font-medium tracking-wide",
  success: "bg-secondary/20 text-secondary-foreground dark:text-secondary rounded-pill px-3 py-1 text-xs font-medium tracking-wide",
  warning: "bg-destructive/10 text-destructive rounded-pill px-3 py-1 text-xs font-medium tracking-wide",
  destructive: "bg-destructive text-destructive-foreground rounded-pill px-3 py-1 text-xs font-medium tracking-wide",
  outline: "border border-border text-foreground rounded-pill px-3 py-1 text-xs font-medium tracking-wide",
  /**
   * The signature element: an ink-stamp impression, like the rubber stamp
   * that marks a filing settled. Double border evokes a stamp die, slight
   * rotation evokes a hand-stamped impression — used for real status only
   * (filed / paid / due), never as generic decoration.
   */
  stamp:
    "border-[5px] border-double border-secondary text-secondary font-serif italic tracking-widest uppercase -rotate-2 px-3 py-0.5 text-xs",
  "stamp-destructive":
    "border-[5px] border-double border-destructive text-destructive font-serif italic tracking-widest uppercase -rotate-2 px-3 py-0.5 text-xs"
};

const STAMP_VARIANTS = new Set<BadgeVariant>(["stamp", "stamp-destructive"]);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isStamp = STAMP_VARIANTS.has(variant);

  useGSAP(
    () => {
      if (!isStamp || !ref.current) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // A stamp hitting paper: descends through real depth (its own
        // perspective, via transformPerspective — no wrapping container
        // needed), then a punch of overshoot on impact, snapping to the
        // resting tilt.
        gsap.set(ref.current, { opacity: 0, y: -48, z: 60, rotate: -16, scale: 1.5, transformPerspective: 400 });

        const tl = gsap.timeline({
          scrollTrigger: { trigger: ref.current, start: "top 85%", once: true }
        });
        tl.to(ref.current, { opacity: 1, y: 0, z: 0, rotate: -6, scale: 1.1, duration: 0.3, ease: "power1.in" }).to(
          ref.current,
          { rotate: -2, scale: 1, duration: 0.25, ease: "back.out(2.5)" }
        );
      });

      return () => mm.revert();
    },
    { dependencies: [isStamp], scope: ref }
  );

  return <span ref={ref} className={cn("inline-flex items-center", variantClasses[variant], className)} {...props} />;
}
