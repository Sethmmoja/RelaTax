"use client";

import { ReactNode } from "react";
import { cn } from "../lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        className={cn("w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-elegant", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 font-serif text-2xl">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
