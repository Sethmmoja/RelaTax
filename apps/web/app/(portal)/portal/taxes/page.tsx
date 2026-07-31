"use client";

import { useEffect, useState } from "react";
import { Badge, DataTable } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useBusiness } from "../../../../lib/business-context";

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

export default function TaxesPage() {
  const { activeBusinessId } = useBusiness();
  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

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

  async function handleSendToWhatsApp(reportId: string) {
    setSendingId(reportId);
    try {
      await apiFetch(`/whatsapp/reports/${reportId}/send?format=pdf`, { method: "POST" });
      alert("Sent! Check your WhatsApp.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not send to WhatsApp.");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-10">
      <h1 className="font-serif text-3xl">Taxes</h1>

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
          emptyMessage="No tax records yet."
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
                <div className="flex flex-wrap gap-3">
                  <button className="text-primary hover:underline" onClick={() => handleExport(r.id, "pdf")}>PDF</button>
                  <button className="text-primary hover:underline" onClick={() => handleExport(r.id, "xlsx")}>Excel</button>
                  <button
                    className="text-primary hover:underline disabled:opacity-50"
                    disabled={sendingId === r.id}
                    onClick={() => handleSendToWhatsApp(r.id)}
                  >
                    {sendingId === r.id ? "Sending…" : "Send to WhatsApp"}
                  </button>
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
