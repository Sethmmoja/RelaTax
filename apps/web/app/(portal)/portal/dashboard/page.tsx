"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useBusiness } from "../../../../lib/business-context";
import { OPEN_PORTAL_AI_EVENT } from "../../../../components/portal/PortalAIChatWidget";
import { Reveal } from "../../../../components/motion/Reveal";

interface TaxRecord {
  id: string;
  taxType: string;
  status: string;
  amountDue: string;
  dueDate: string;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
}

interface DocumentItem {
  id: string;
  originalName: string;
  category: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { activeBusinessId } = useBusiness();
  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  useEffect(() => {
    if (!activeBusinessId) return;
    apiFetch<TaxRecord[]>(`/businesses/${activeBusinessId}/taxes`).then(setTaxes).catch(() => setTaxes([]));
    apiFetch<NotificationItem[]>("/notifications").then(setNotifications).catch(() => setNotifications([]));
    apiFetch<DocumentItem[]>(`/businesses/${activeBusinessId}/documents`).then((docs) => setDocuments(docs.slice(0, 5))).catch(() => setDocuments([]));
  }, [activeBusinessId]);

  const due = taxes.filter((t) => t.status === "DUE");
  const paid = taxes.filter((t) => t.status === "PAID");
  const outstanding = taxes.filter((t) => t.status === "OUTSTANDING" || t.status === "PENALTY");
  const unread = notifications.filter((n) => !n.readAt);

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl">Dashboard</h1>

      <Card className="border-primary/30 bg-accent/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="font-medium">Have a question about your finances?</p>
            <p className="text-sm text-muted-foreground">
              Ask the AI assistant to explain a report, a tax balance, or an invoice — grounded in this business's actual data.
            </p>
          </div>
          <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PORTAL_AI_EVENT))}>
            Ask AI Assistant
          </Button>
        </CardContent>
      </Card>

      <Reveal stagger=".stat-card" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/portal/taxes" className="stat-card">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader><CardTitle className="text-base">Taxes due</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{due.length}</p></CardContent>
          </Card>
        </Link>
        <Link href="/portal/taxes" className="stat-card">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader><CardTitle className="text-base">Taxes paid</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{paid.length}</p></CardContent>
          </Card>
        </Link>
        <Link href="/portal/taxes" className="stat-card">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader><CardTitle className="text-base">Outstanding / penalties</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{outstanding.length}</p></CardContent>
          </Card>
        </Link>
        <Link href="/portal/notifications" className="stat-card">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader><CardTitle className="text-base">Unread notifications</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{unread.length}</p></CardContent>
          </Card>
        </Link>
        <Link href="/portal/documents" className="stat-card">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader><CardTitle className="text-base">Recent documents</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{documents.length}</p></CardContent>
          </Card>
        </Link>
      </Reveal>

      <Card>
        <CardHeader><CardTitle>Upcoming filing deadlines</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {taxes.length === 0 && <p className="text-sm text-muted-foreground">No tax records yet.</p>}
          {taxes.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
              <span>{t.taxType} — due {new Date(t.dueDate).toLocaleDateString()}</span>
              <Badge variant={t.status === "PAID" ? "stamp" : "stamp-destructive"}>{t.status}</Badge>
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
