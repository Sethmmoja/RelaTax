"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useBusiness } from "../../../../lib/business-context";

interface PayrollSummary {
  id: string;
  periodLabel: string;
  status: string;
  runAt: string | null;
  reportDocumentId: string | null;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
}

export default function PortalPayrollPage() {
  const { activeBusinessId } = useBusiness();
  const [runs, setRuns] = useState<PayrollSummary[]>([]);

  function loadRuns() {
    if (!activeBusinessId) return;
    apiFetch<PayrollSummary[]>(`/businesses/${activeBusinessId}/payroll-summary`).then(setRuns).catch(() => setRuns([]));
  }

  useEffect(loadRuns, [activeBusinessId]);

  async function handleDownload(documentId: string) {
    const res = await apiFetch<{ url: string }>(`/businesses/${activeBusinessId}/documents/${documentId}/download`);
    window.open(res.url, "_blank");
  }

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl">Payroll</h1>
      <p className="text-sm text-muted-foreground">
        Payroll for your team is run by your RelaTax accountant. Each employee gets their own payslip by email;
        this is the summary report for each completed pay run.
      </p>

      <DataTable
        columns={[
          { header: "Period", cell: (r: PayrollSummary) => r.periodLabel },
          { header: "Employees", cell: (r: PayrollSummary) => r.employeeCount },
          { header: "Gross pay", cell: (r: PayrollSummary) => `KES ${r.totalGrossPay.toLocaleString()}` },
          { header: "Net pay", cell: (r: PayrollSummary) => `KES ${r.totalNetPay.toLocaleString()}` },
          { header: "Distributed", cell: (r: PayrollSummary) => (r.runAt ? new Date(r.runAt).toLocaleDateString() : "—") },
          {
            header: "",
            cell: (r: PayrollSummary) =>
              r.reportDocumentId ? (
                <button className="text-sm text-primary hover:underline" onClick={() => handleDownload(r.reportDocumentId!)}>
                  Download report
                </button>
              ) : null
          }
        ]}
        rows={runs}
        keyFor={(r) => r.id}
        emptyMessage="No completed payroll runs yet."
      />
    </div>
  );
}
