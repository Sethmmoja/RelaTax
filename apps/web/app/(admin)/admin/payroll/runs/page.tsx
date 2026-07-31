"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, DataTable, Input, Modal } from "@relatax/ui";
import { apiFetch } from "../../../../../lib/api-client";
import { useAuth } from "../../../../../lib/auth-context";

const APPROVE_ROLES = ["SUPER_ADMIN", "ADMIN", "FINANCE"];

interface Business {
  id: string;
  name: string;
}

interface Payslip {
  id: string;
  grossPay: string;
  nssfTier1: string;
  nssfTier2: string;
  nssf: string;
  shif: string;
  housingLevy: string;
  taxablePay: string;
  payeBeforeRelief: string;
  personalRelief: string;
  paye: string;
  netPay: string;
  emailedAt: string | null;
  employee: { id: string; name: string; email: string };
}

interface PayrollRun {
  id: string;
  periodLabel: string;
  status: string;
  createdAt: string;
  runAt: string | null;
  payslips: Payslip[];
}

export default function PayrollRunsPage() {
  const { user } = useAuth();
  const role = user?.roleAssignments[0]?.role.name;
  const canApprove = role ? APPROVE_ROLES.includes(role) : false;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [periodLabel, setPeriodLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PayrollRun | null>(null);

  useEffect(() => {
    apiFetch<Business[]>("/admin/businesses").then((rows) => {
      setBusinesses(rows);
      if (rows[0]) setBusinessId(rows[0].id);
    });
  }, []);

  function loadRuns() {
    if (!businessId) return;
    apiFetch<PayrollRun[]>(`/businesses/${businessId}/payroll-runs`).then(setRuns).catch(() => setRuns([]));
  }

  useEffect(loadRuns, [businessId]);

  async function handleCreateRun(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await apiFetch(`/businesses/${businessId}/payroll-runs`, {
        method: "POST",
        body: JSON.stringify({ periodLabel })
      });
      setPeriodLabel("");
      loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create run");
    } finally {
      setCreating(false);
    }
  }

  async function runAction(runId: string, action: "calculate" | "approve" | "distribute") {
    setBusyRunId(runId);
    setError(null);
    try {
      await apiFetch(`/payroll-runs/${runId}/${action}`, { method: "POST" });
      loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} this run`);
    } finally {
      setBusyRunId(null);
    }
  }

  async function openDetail(runId: string) {
    const run = await apiFetch<PayrollRun>(`/payroll-runs/${runId}`);
    setDetail(run);
  }

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl">Payroll</h1>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Business</label>
        <select
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
        >
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleCreateRun} className="flex items-end gap-4 rounded-lg border border-border bg-card p-6">
        <Input placeholder="Period, e.g. July 2026" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} required />
        <Button type="submit" disabled={creating}>{creating ? "Creating…" : "New run"}</Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <DataTable
        columns={[
          {
            header: "Period",
            cell: (r: PayrollRun) => (
              <button className="text-left text-primary hover:underline" onClick={() => openDetail(r.id)}>
                {r.periodLabel}
              </button>
            )
          },
          { header: "Status", cell: (r: PayrollRun) => r.status },
          { header: "Created", cell: (r: PayrollRun) => new Date(r.createdAt).toLocaleString() },
          {
            header: "",
            cell: (r: PayrollRun) => {
              const busy = busyRunId === r.id;
              if (r.status === "DRAFT") {
                return <Button size="sm" disabled={busy} onClick={() => runAction(r.id, "calculate")}>{busy ? "Calculating…" : "Calculate"}</Button>;
              }
              if (r.status === "CALCULATED") {
                if (!canApprove) return <span className="text-sm text-muted-foreground">Awaiting approval</span>;
                return <Button size="sm" disabled={busy} onClick={() => runAction(r.id, "approve")}>{busy ? "Approving…" : "Approve"}</Button>;
              }
              if (r.status === "APPROVED") {
                if (!canApprove) return <span className="text-sm text-muted-foreground">Awaiting distribution</span>;
                return <Button size="sm" disabled={busy} onClick={() => runAction(r.id, "distribute")}>{busy ? "Distributing…" : "Distribute"}</Button>;
              }
              return <span className="text-sm text-muted-foreground">Done</span>;
            }
          }
        ]}
        rows={runs}
        keyFor={(r) => r.id}
        emptyMessage="No payroll runs yet for this business."
      />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Payslips — ${detail?.periodLabel ?? ""}`}>
        <div className="space-y-3">
          {detail?.payslips.map((p) => (
            <div key={p.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{p.employee.name} ({p.employee.email})</p>
              <p className="text-muted-foreground">
                Gross KES {Number(p.grossPay).toLocaleString()} — NSSF Tier I {Number(p.nssfTier1).toLocaleString()},
                Tier II {Number(p.nssfTier2).toLocaleString()}, SHIF {Number(p.shif).toLocaleString()}, Housing Levy{" "}
                {Number(p.housingLevy).toLocaleString()}
              </p>
              <p className="text-muted-foreground">
                Taxable pay KES {Number(p.taxablePay).toLocaleString()} — PAYE before relief{" "}
                {Number(p.payeBeforeRelief).toLocaleString()}, relief {Number(p.personalRelief).toLocaleString()},
                final PAYE {Number(p.paye).toLocaleString()}
              </p>
              <p className="font-medium">Net pay: KES {Number(p.netPay).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {p.emailedAt ? `Emailed ${new Date(p.emailedAt).toLocaleString()}` : "Not yet emailed"}
              </p>
            </div>
          ))}
          {detail && detail.payslips.length === 0 && (
            <p className="text-sm text-muted-foreground">No payslips calculated yet.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
