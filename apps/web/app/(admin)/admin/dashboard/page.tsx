"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useAuth } from "../../../../lib/auth-context";
import { Reveal } from "../../../../components/motion/Reveal";

interface Business {
  id: string;
  name: string;
  status: string;
}

interface BusinessRequest {
  id: string;
  status: string;
  requestedBy: { name: string; email: string };
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  user: { name: string } | null;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.roleAssignments.some((ra) => ra.role.name === "SUPER_ADMIN") ?? false;
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  useEffect(() => {
    apiFetch<Business[]>("/admin/businesses").then(setBusinesses).catch(() => setBusinesses([]));
    apiFetch<BusinessRequest[]>("/admin/businesses/requests?status=PENDING").then(setRequests).catch(() => setRequests([]));
    if (isSuperAdmin) {
      apiFetch<AuditEntry[]>("/admin/audit-log").then((rows) => setAuditLog(rows.slice(0, 8))).catch(() => setAuditLog([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl">Dashboard</h1>

      <Reveal stagger=".stat-card" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/businesses#all-businesses" className="stat-card">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader><CardTitle className="text-base">Businesses</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{businesses.length}</p></CardContent>
          </Card>
        </Link>
        <Link href="/admin/businesses#pending-requests" className="stat-card">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader><CardTitle className="text-base">Pending requests</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{requests.length}</p></CardContent>
          </Card>
        </Link>
        <Link href="/admin/businesses#all-businesses" className="stat-card">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader><CardTitle className="text-base">Active businesses</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{businesses.filter((b) => b.status === "ACTIVE").length}</p></CardContent>
          </Card>
        </Link>
        {isSuperAdmin && (
          <Link href="/admin/audit-log" className="stat-card">
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-semibold">{auditLog.length}</p></CardContent>
            </Card>
          </Link>
        )}
      </Reveal>

      {isSuperAdmin && (
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {auditLog.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
            {auditLog.map((a) => (
              <div key={a.id} className="flex justify-between border-b border-border pb-2 text-sm last:border-0">
                <span>{a.user?.name ?? "System"} — {a.action}</span>
                <span className="text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
