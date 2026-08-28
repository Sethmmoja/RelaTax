"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap";
import { cn } from "../lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  // Stays mounted for the length of the exit tween — `open` flips false
  // immediately, but the DOM (and the animation) needs one more beat.
  const [rendered, setRendered] = useState(open);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setRendered(true);
  }, [open]);

  useGSAP(
    () => {
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      if (!rendered || !overlay || !panel) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (open) {
          gsap.set(overlay, { opacity: 0 });
          gsap.set(panel, { opacity: 0, scale: 0.96 });
          gsap.to(overlay, { opacity: 1, duration: 0.18, ease: "power2.out" });
          gsap.to(panel, { opacity: 1, scale: 1, duration: 0.18, ease: "power2.out" });
        } else {
          gsap.to(overlay, { opacity: 0, duration: 0.14, ease: "power1.in" });
          gsap.to(panel, {
            opacity: 0,
            scale: 0.96,
            duration: 0.14,
            ease: "power1.in",
            onComplete: () => setRendered(false)
          });
        }
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        if (!open) setRendered(false);
      });

      return () => mm.revert();
    },
    { dependencies: [open, rendered], scope: panelRef }
  );

  if (!rendered) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={cn("w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-elegant", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 font-serif text-2xl">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
