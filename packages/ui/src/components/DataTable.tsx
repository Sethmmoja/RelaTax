"use client";

import { ReactNode, useMemo, useRef } from "react";
import { gsap, useGSAP } from "../lib/gsap";
import { cn } from "../lib/utils";

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyFor: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, rows, keyFor, emptyMessage = "No records found." }: DataTableProps<T>) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const prevSignatureRef = useRef<string | null>(null);
  const signature = useMemo(() => rows.map(keyFor).join("|"), [rows, keyFor]);

  // Capped entrance stagger, gated on the row-ID set rather than array
  // identity — pages that re-fetch the same rows after an action (e.g.
  // approving a payroll run) must not re-flash an already-visible table.
  useGSAP(
    () => {
      const tbody = tbodyRef.current;
      if (!tbody || rows.length === 0) return;
      if (prevSignatureRef.current === signature) return;
      prevSignatureRef.current = signature;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rowEls = tbody.querySelectorAll("tr");
        gsap.set(rowEls, { opacity: 0, y: 6 });
        gsap.to(rowEls, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: { amount: 0.25 } });
      });

      return () => mm.revert();
    },
    { dependencies: [signature], scope: tbodyRef }
  );

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className={cn("px-4 py-3 font-medium", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {rows.map((row) => (
            <tr key={keyFor(row)} className="border-t border-border">
              {columns.map((col) => (
                <td key={col.header} className={cn("px-4 py-3", col.className)}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
