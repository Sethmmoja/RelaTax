"use client";

import { useEffect, useState } from "react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@relatax/ui";
import { apiFetch } from "../../../../../lib/api-client";
import { useBusiness } from "../../../../../lib/business-context";

interface TaxRecord {
  id: string;
  taxType: string;
  status: string;
  dueDate: string;
}

interface DocumentItem {
  id: string;
  originalName: string;
  createdAt: string;
}

export default function ClientViewDashboardPage() {
  const { activeBusinessId, activeBusiness } = useBusiness();
  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  useEffect(() => {
    if (!activeBusinessId) return;
    apiFetch<TaxRecord[]>(`/businesses/${activeBusinessId}/taxes`).then(setTaxes).catch(() => setTaxes([]));
    apiFetch<DocumentItem[]>(`/businesses/${activeBusinessId}/documents`)
      .then((docs) => setDocuments(docs.slice(0, 5)))
      .catch(() => setDocuments([]));
  }, [activeBusinessId]);

  if (!activeBusinessId) {
    return <p className="text-sm text-muted-foreground">No businesses onboarded yet.</p>;
  }

  const due = taxes.filter((t) => t.status === "DUE");
  const paid = taxes.filter((t) => t.status === "PAID");
  const outstanding = taxes.filter((t) => t.status === "OUTSTANDING" || t.status === "PENALTY");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">{activeBusiness?.name ?? "Client"} — Dashboard</h1>
        <p className="text-sm text-muted-foreground">Acting as this client&apos;s accountant view.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Taxes due</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{due.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Taxes paid</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{paid.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Outstanding / penalties</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{outstanding.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent documents</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{documents.length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming filing deadlines</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {taxes.length === 0 && <p className="text-sm text-muted-foreground">No tax records yet.</p>}
          {taxes.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
              <span>{t.taxType} — due {new Date(t.dueDate).toLocaleDateString()}</span>
              <Badge variant={t.status === "DUE" ? "warning" : t.status === "PENALTY" ? "destructive" : "default"}>
                {t.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recently uploaded documents</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
          {documents.map((d) => (
            <div key={d.id} className="flex justify-between text-sm">
              <span>{d.originalName}</span>
              <span className="text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
