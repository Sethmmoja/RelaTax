"use client";

import { useEffect, useState } from "react";
import { Button, DataTable, Input } from "@relatax/ui";
import { apiFetch } from "../../../../../lib/api-client";
import { useBusiness } from "../../../../../lib/business-context";

interface ReportRow {
  id: string;
  type: string;
  source: string;
  period: { label: string; startDate: string; endDate: string };
}

// VAT, PAYE and Corporation Tax reports live under the Taxes tab, not here.
const REPORT_TYPES = ["FINANCIAL_STATEMENT", "PROFIT_AND_LOSS", "BALANCE_SHEET", "CASH_FLOW", "TRIAL_BALANCE", "DRAFT", "CUSTOM"];
const TAX_REPORT_TYPES = new Set(["VAT", "PAYE", "CORPORATION_TAX"]);

export default function ClientViewReportsPage() {
  const { activeBusinessId, activeBusiness } = useBusiness();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [reports, setReports] = useState<ReportRow[]>([]);

  async function loadReports() {
    if (!activeBusinessId) return;
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (type) params.set("type", type);
    const result = await apiFetch<{ data: ReportRow[] }>(`/businesses/${activeBusinessId}/reports?${params}`);
    setReports(result.data.filter((r) => !TAX_REPORT_TYPES.has(r.type)));
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId]);

  async function handleExport(reportId: string, format: "pdf" | "xlsx") {
    const result = await apiFetch<{ url: string | null; content?: string }>(`/reports/${reportId}/export?format=${format}`);
    if (result.url) {
      window.open(result.url, "_blank");
    } else {
      alert(result.content ?? "Export not available yet.");
    }
  }

  if (!activeBusinessId) {
    return <p className="text-sm text-muted-foreground">No businesses onboarded yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">{activeBusiness?.name ?? "Client"} — Reports</h1>
        <p className="text-sm text-muted-foreground">Acting as this client&apos;s accountant view.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Report type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">All types</option>
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <Button onClick={loadReports}>Apply filters</Button>
      </div>

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
        emptyMessage="No reports found for this filter."
      />
    </div>
  );
}
