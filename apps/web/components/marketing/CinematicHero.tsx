"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP, Badge, Button } from "@relatax/ui";

const statement = [
  { label: "VAT", period: "Jun 2026", amount: "KES 184,250", status: "filed" as const },
  { label: "PAYE", period: "Jul 2026", amount: "KES 96,400", status: "due" as const },
  { label: "Corporation Tax", period: "Q2 2026", amount: "KES 512,000", status: "filed" as const },
  { label: "NSSF · SHIF · AHL", period: "Jul 2026", amount: "KES 41,120", status: "filed" as const }
];

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });

/**
 * "Ledger in Motion" hero. Same content and brand language as the original
 * Hero — the cinematic layer is the depth staging: the statement card sits
 * in front of two blank ledger pages in real 3D space (perspective +
 * translateZ), settles flat on load, then as the user scrolls past the
 * fold the stack recedes and fans out like a camera pulling back through
 * paper. Entrance timing/easing unchanged from the original (already tuned).
 */
export function CinematicHero() {
  const asOfDate = dateFormatter.format(new Date());
  const rootRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const copyRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pageBackRef = useRef<HTMLDivElement>(null);
  const pageMidRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const headlineLines = gsap.utils.toArray<HTMLElement>(headlineRef.current!.children);

        gsap.set([eyebrowRef.current, copyRef.current, ctaRef.current], { opacity: 0, y: 16 });
        gsap.set(headlineLines, { opacity: 0, y: 28 });
        gsap.set(cardRef.current, { opacity: 0, y: 20, x: 16, rotateY: -10, rotateX: 3, z: 40 });
        gsap.set(pageMidRef.current, { opacity: 0, rotate: 3, x: 10, y: 14 });
        gsap.set(pageBackRef.current, { opacity: 0, rotate: 6, x: 20, y: 26 });

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        tl.to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.5 })
          .to(headlineLines, { opacity: 1, y: 0, duration: 0.65, stagger: 0.12 }, "-=0.25")
          .to(copyRef.current, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3")
          .to(ctaRef.current, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3")
          .to(pageBackRef.current, { opacity: 1, duration: 0.5 }, "-=0.5")
          .to(pageMidRef.current, { opacity: 1, duration: 0.5 }, "-=0.4")
          .to(cardRef.current, { opacity: 1, y: 0, x: 0, rotateY: 0, rotateX: 0, z: 0, duration: 0.8 }, "-=0.5");

        // Depth recede as the hero scrolls out — a cheap scrub (no pin, no
        // layout recalculation), just transforms following native scroll.
        gsap.timeline({
          scrollTrigger: { trigger: rootRef.current, start: "top top", end: "bottom top", scrub: 0.6 }
        })
          .to(stageRef.current, { rotateX: 8, ease: "none" }, 0)
          .to(cardRef.current, { z: -60, y: -20, ease: "none" }, 0)
          .to(pageMidRef.current, { z: -120, x: 30, rotate: 5, ease: "none" }, 0)
          .to(pageBackRef.current, { z: -200, x: 55, rotate: 9, ease: "none" }, 0);
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([cardRef.current, pageMidRef.current, pageBackRef.current], { opacity: 1, x: 0, y: 0, rotate: 0, z: 0 });
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <section ref={rootRef} className="overflow-hidden px-6 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span
            ref={eyebrowRef}
            className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            <span className="h-px w-8 bg-secondary" aria-hidden />
            Fractional accounting · Kenya &amp; East Africa
          </span>
          <h1 ref={headlineRef} className="font-serif text-5xl leading-[1.05] md:text-7xl">
            <span className="block">Every filing,</span>
            <span className="block italic text-primary/80 dark:text-primary">accounted for.</span>
          </h1>
          <p ref={copyRef} className="mt-6 max-w-lg text-lg text-muted-foreground">
            RelaTax gives ambitious Kenyan businesses partner-level accounting, tax compliance and payroll —
            without the full-time cost. Clean books, on-time filings, decisions you can defend.
          </p>
          <div ref={ctaRef} className="mt-9 flex flex-wrap gap-4">
            <Link href="/contact#tell-us-about-your-business">
              <Button size="lg">Book a free consult</Button>
            </Link>
            <Link href="/services">
              <Button size="lg" variant="outline">
                Explore services
              </Button>
            </Link>
          </div>
        </div>

        {/* Signature element: the statement mockup, staged as a small stack of
            ledger pages in real 3D space rather than a single flat card. */}
        <div ref={stageRef} className="perspective-stage relative">
          <div ref={pageBackRef} className="preserve-3d absolute inset-0 rounded border border-border bg-card/70" aria-hidden />
          <div ref={pageMidRef} className="preserve-3d absolute inset-0 rounded border border-border bg-card/85 ledger-rule" aria-hidden />
          <div ref={cardRef} className="preserve-3d relative">
            <div className="absolute -inset-3 -z-10 rounded bg-primary/[0.03] dark:bg-primary/10" aria-hidden />
            <div className="rounded border border-border bg-card shadow-elegant">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <p className="font-serif text-lg">Statement of filings</p>
                  <p className="text-xs text-muted-foreground">Baraka Textiles Ltd · Nairobi</p>
                </div>
                <span
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                  suppressHydrationWarning
                >
                  as of {asOfDate}
                </span>
              </div>
              <div className="ledger-rule">
                {statement.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 px-6 py-[13px]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.label}</p>
                      <p className="text-xs text-muted-foreground">{row.period}</p>
                    </div>
                    <p className="tabular-figures shrink-0 text-sm text-muted-foreground">{row.amount}</p>
                    {row.status === "filed" ? (
                      <Badge variant="stamp" className="shrink-0">
                        Filed
                      </Badge>
                    ) : (
                      <Badge variant="stamp-destructive" className="shrink-0">
                        Due
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">A real client's view — every business gets its own.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
