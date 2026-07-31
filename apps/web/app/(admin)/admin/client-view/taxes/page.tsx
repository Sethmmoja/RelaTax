"use client";

import { useEffect, useState } from "react";
import { Badge, DataTable } from "@relatax/ui";
import { apiFetch } from "../../../../../lib/api-client";
import { useBusiness } from "../../../../../lib/business-context";

interface TaxRecord {
  id: string;
  taxType: string;
  status: string;
  amountDue: string;
  amountPaid: string;
  penalty: string;
  dueDate: string;
  period: { label: string };
}

interface ReportRow {
  id: string;
  type: string;
  source: string;
  period: { label: string };
}

const TAX_REPORT_TYPES = new Set(["VAT", "PAYE", "CORPORATION_TAX"]);

export default function ClientViewTaxesPage() {
  const { activeBusinessId, activeBusiness } = useBusiness();
  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);

  useEffect(() => {
    if (!activeBusinessId) return;
    apiFetch<TaxRecord[]>(`/businesses/${activeBusinessId}/taxes`).then(setTaxes).catch(() => setTaxes([]));
    apiFetch<{ data: ReportRow[] }>(`/businesses/${activeBusinessId}/reports`)
      .then((result) => setReports(result.data.filter((r) => TAX_REPORT_TYPES.has(r.type))))
      .catch(() => setReports([]));
  }, [activeBusinessId]);

  async function handleExport(reportId: string, format: "pdf" | "xlsx") {
    const result = await apiFetch<{ url: string | null; content?: string }>(`/reports/${reportId}/export?format=${format}`);
    if (result.url) window.open(result.url, "_blank");
    else alert(result.content ?? "Export not available yet.");
  }

  if (!activeBusinessId) {
    return <p className="text-sm text-muted-foreground">No businesses onboarded yet.</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl">{activeBusiness?.name ?? "Client"} — Taxes</h1>
        <p className="text-sm text-muted-foreground">Acting as this client&apos;s accountant view.</p>
      </div>

      <section>
        <h2 className="mb-3 font-serif text-xl">Filing status</h2>
        <DataTable
          columns={[
            { header: "Type", cell: (t: TaxRecord) => t.taxType.replace(/_/g, " ") },
            { header: "Period", cell: (t: TaxRecord) => t.period.label },
            { header: "Due date", cell: (t: TaxRecord) => new Date(t.dueDate).toLocaleDateString() },
            { header: "Amount due (KES)", cell: (t: TaxRecord) => Number(t.amountDue).toLocaleString() },
            { header: "Amount paid (KES)", cell: (t: TaxRecord) => Number(t.amountPaid).toLocaleString() },
            {
              header: "Status",
              cell: (t: TaxRecord) => <Badge variant={t.status === "PAID" ? "stamp" : "stamp-destructive"}>{t.status}</Badge>
            }
          ]}
          rows={taxes}
          keyFor={(t) => t.id}
          emptyMessage="No tax records for this business."
        />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl">Tax reports</h2>
        <DataTable
          columns={[
            { header: "Type", cell: (r: ReportRow) => r.type.replace(/_/g, " ") },
            { header: "Period", cell: (r: ReportRow) => r.period.label },
            { header: "Source", cell: (r: ReportRow) => r.source },
            {
              header: "Download",
              cell: (r: ReportRow) => (
                <div className="flex gap-2">
                  <button className="text-primary hover:underline" onClick={() => handleExport(r.id, "pdf")}>PDF</button>
                  <button className="text-primary hover:underline" onClick={() => handleExport(r.id, "xlsx")}>Excel</button>
                </div>
              )
            }
          ]}
          rows={reports}
          keyFor={(r) => r.id}
          emptyMessage="No tax reports available yet."
        />
      </section>
    </div>
  );
}
