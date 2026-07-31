"use client";

import { useEffect, useState } from "react";
import { Button, DataTable } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    const rows = await apiFetch<AuditEntry[]>(`/admin/audit-log?${params}`).catch(() => [] as AuditEntry[]);
    setEntries(rows);
    if (!entityType && !from && !to) {
      setEntityTypes([...new Set(rows.map((r) => r.entityType))].sort());
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Audit Log</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Entity</label>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">All entities</option>
            {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
        </div>
        <Button onClick={load}>Apply filters</Button>
      </div>

      <DataTable
        columns={[
          { header: "Actor", cell: (e: AuditEntry) => e.user?.name ?? "System" },
          { header: "Action", cell: (e: AuditEntry) => e.action },
          { header: "Entity", cell: (e: AuditEntry) => e.entityType },
          { header: "When", cell: (e: AuditEntry) => new Date(e.createdAt).toLocaleString() }
        ]}
        rows={entries}
        keyFor={(e) => e.id}
        emptyMessage="No activity recorded yet."
      />
    </div>
  );
}
