"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button, Modal } from "@relatax/ui";
import { useAuth } from "../../../lib/auth-context";
import { BusinessProvider, useBusiness } from "../../../lib/business-context";
import { apiFetch } from "../../../lib/api-client";
import { PortalAIChatWidget } from "../../../components/portal/PortalAIChatWidget";
import { Logo } from "../../../components/Logo";
import { PortalFooter } from "../../../components/PortalFooter";
import { SidebarNav } from "../../../components/SidebarNav";
import { RouteTransition } from "../../../components/RouteTransition";

const navItems = [
  { href: "/portal/dashboard", label: "Dashboard" },
  { href: "/portal/reports", label: "Reports" },
  { href: "/portal/taxes", label: "Taxes" },
  { href: "/portal/invoices", label: "Invoices" },
  { href: "/portal/payroll", label: "Payroll" },
  { href: "/portal/products", label: "Products" },
  { href: "/portal/pos", label: "POS" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/notifications", label: "Notifications" },
  { href: "/portal/settings", label: "Settings" }
];

function AddBusinessModal() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/businesses/requests", { method: "POST", body: JSON.stringify({ notes: notes || undefined }) });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    setSubmitted(false);
    setNotes("");
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        + Add Business
      </Button>
      <Modal open={open} onClose={close} title="Request a new business">
        {submitted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Thanks — we've notified the RelaTax team. They'll set up your business and let you know once it's ready.
            </p>
            <Button className="w-full" onClick={close}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adding a business requires a short consultation so we can set it up correctly. Tell us a bit about it
              and our team will reach out.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Business name, industry, anything else useful (optional)"
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending…" : "Request consultation"}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}

function PortalChrome({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { businesses, activeBusinessId, activeBusiness, setActiveBusinessId } = useBusiness();

  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden w-56 shrink-0 border-r border-border bg-card p-6 md:block"
        style={activeBusiness?.brandColor ? { borderTopWidth: 3, borderTopColor: activeBusiness.brandColor } : undefined}
      >
        <Link href="/" className="mb-8 block">
          <Logo className="h-7 w-auto" />
        </Link>
        <SidebarNav items={navItems} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {activeBusiness?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeBusiness.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: activeBusiness?.brandColor ?? "#999" }}
              >
                {activeBusiness?.name.slice(0, 1) ?? "?"}
              </span>
            )}
            <select
              value={activeBusinessId ?? ""}
              onChange={(e) => setActiveBusinessId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <AddBusinessModal />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">{user?.name}</span>
            <button onClick={logout} className="font-medium hover:text-primary">
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <RouteTransition>{children}</RouteTransition>
        </main>
        <PortalFooter />
      </div>
      <PortalAIChatWidget />
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <BusinessProvider>
      <PortalChrome>{children}</PortalChrome>
    </BusinessProvider>
  );
}
