"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../../../lib/auth-context";
import { BusinessProvider, useBusiness } from "../../../lib/business-context";
import { Logo } from "../../../components/Logo";
import { PortalFooter } from "../../../components/PortalFooter";
import { SidebarNav } from "../../../components/SidebarNav";
import { RouteTransition } from "../../../components/RouteTransition";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/businesses", label: "Businesses" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/invoice-requests", label: "Invoice Requests", superAdminOnly: true },
  { href: "/admin/payroll/employees", label: "Employees" },
  { href: "/admin/payroll/runs", label: "Payroll" },
  { href: "/admin/knowledge-base", label: "Knowledge Base" },
  { href: "/admin/notifications", label: "Notifications", superAdminOnly: true },
  { href: "/admin/contact-inquiries", label: "Contact Inquiries", superAdminOnly: true },
  { href: "/admin/users", label: "Users", superAdminOnly: true },
  { href: "/admin/audit-log", label: "Audit Log", superAdminOnly: true }
];

const clientViewItems = [
  { href: "/admin/client-view/dashboard", label: "Dashboard" },
  { href: "/admin/client-view/reports", label: "Reports" },
  { href: "/admin/client-view/taxes", label: "Taxes" }
];

function BusinessSwitcher() {
  const { businesses, activeBusinessId, setActiveBusinessId } = useBusiness();

  if (businesses.length === 0) return null;

  return (
    <select
      value={activeBusinessId ?? ""}
      onChange={(e) => setActiveBusinessId(e.target.value)}
      className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
    >
      {businesses.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}

function AdminChrome({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const role = user?.roleAssignments[0]?.role.name ?? "STAFF";
  const inClientView = pathname.startsWith("/admin/client-view");
  const isSuperAdmin = role === "SUPER_ADMIN";
  const visibleNavItems = navItems.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card p-6 md:block">
        <div className="mb-8">
          <Logo className="h-7 w-auto" />
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
        </div>
        <SidebarNav items={visibleNavItems} />

        <p className="mb-2 mt-8 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Client view
        </p>
        <SidebarNav items={clientViewItems} />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4 text-sm">
          <div className="flex items-center gap-3">
            {inClientView && (
              <>
                <span className="text-xs font-semibold tracking-wide text-primary">VIEWING AS CLIENT:</span>
                <BusinessSwitcher />
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Signed in as {user?.name} ({role})</span>
            <button onClick={logout} className="font-medium hover:text-primary">Log out</button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <RouteTransition>{children}</RouteTransition>
        </main>
        <PortalFooter />
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.isStaff)) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user || !user.isStaff) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <BusinessProvider>
      <AdminChrome>{children}</AdminChrome>
    </BusinessProvider>
  );
}
