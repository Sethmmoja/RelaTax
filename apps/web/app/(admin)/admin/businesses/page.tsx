"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, DataTable, Input, Modal } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useBusiness } from "../../../../lib/business-context";

interface Business {
  id: string;
  name: string;
  status: string;
  logoUrl: string | null;
  brandColor: string | null;
}

interface BusinessRequest {
  id: string;
  status: string;
  notes: string | null;
  requestedBy: { id: string; name: string; email: string };
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  isOwner: boolean;
}

interface QuickBooksConnection {
  connected: boolean;
  connection: { realmId: string; lastSyncedAt: string | null } | null;
}

interface SyncLog {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  recordsUpserted: number;
  error: string | null;
}

interface CloudDriveConnection {
  connected: boolean;
  connection: { provider: string; folderName: string | null; lastSyncedAt: string | null } | null;
  /** True when the API runs the offline mock connector — no real consent screen exists to send anyone to. */
  mock: boolean;
}

interface MpesaConnection {
  connected: boolean;
  environment?: string;
  shortCode?: string;
}

export default function BusinessesPage() {
  const router = useRouter();
  const { setActiveBusinessId } = useBusiness();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [requests, setRequests] = useState<BusinessRequest[]>([]);

  const [modalRequest, setModalRequest] = useState<BusinessRequest | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#c96f4a");

  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editName, setEditName] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editBrandColor, setEditBrandColor] = useState("#c96f4a");
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);

  const [qb, setQb] = useState<QuickBooksConnection | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);

  const [drive, setDrive] = useState<CloudDriveConnection | null>(null);
  const [importLogs, setImportLogs] = useState<SyncLog[]>([]);
  const [importing, setImporting] = useState(false);

  const [driveResult, setDriveResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [mpesa, setMpesa] = useState<MpesaConnection | null>(null);
  const [mpesaEnvironment, setMpesaEnvironment] = useState("sandbox");
  const [mpesaShortCode, setMpesaShortCode] = useState("");
  const [mpesaConsumerKey, setMpesaConsumerKey] = useState("");
  const [mpesaConsumerSecret, setMpesaConsumerSecret] = useState("");
  const [mpesaPasskey, setMpesaPasskey] = useState("");
  const [savingMpesa, setSavingMpesa] = useState(false);

  async function loadAll() {
    apiFetch<Business[]>("/admin/businesses").then(setBusinesses).catch(() => setBusinesses([]));
    apiFetch<BusinessRequest[]>("/admin/businesses/requests?status=PENDING").then(setRequests).catch(() => setRequests([]));
  }

  useEffect(() => {
    loadAll();
  }, []);

  /**
   * Google sends the browser back here after consent. Surface the outcome —
   * a failure is usually something the person who just clicked can fix
   * ("create a subfolder named X"), so the reason is shown rather than a bare
   * "it didn't work". The query string is then cleared so a refresh doesn't
   * replay a stale result.
   */
  useEffect(() => {
    if (businesses.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("cloudDrive");
    if (!status) return;

    const business = businesses.find((b) => b.id === params.get("businessId"));
    setDriveResult(
      status === "connected"
        ? { ok: true, message: `Google Drive connected${business ? ` for ${business.name}` : ""}.` }
        : { ok: false, message: params.get("reason") || "Connecting Google Drive failed." }
    );
    if (business) openEdit(business);
    window.history.replaceState({}, "", window.location.pathname);
    // Runs once businesses are loaded, so the returning businessId can be named.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses]);

  /**
   * Opens this business's client-view portal directly — no separate login.
   * The caller is already authenticated as staff; BusinessMemberGuard already
   * permits this (Super Admin bypasses entirely, other staff via their
   * StaffBusinessAssignment), so setting the active business and navigating
   * is the whole "impersonation" mechanism.
   */
  function handleViewPortal(businessId: string) {
    setActiveBusinessId(businessId);
    router.push("/admin/client-view/dashboard");
  }

  async function handleArchive(businessId: string) {
    await apiFetch(`/admin/businesses/${businessId}/archive`, { method: "PATCH" });
    loadAll();
  }

  async function handleCreateBusiness(e: FormEvent) {
    e.preventDefault();
    if (!modalRequest) return;
    await apiFetch("/admin/businesses", {
      method: "POST",
      body: JSON.stringify({
        name: businessName,
        ownerUserId: modalRequest.requestedBy.id,
        fulfillsRequestId: modalRequest.id,
        logoUrl: logoUrl || undefined,
        brandColor: brandColor || undefined
      })
    });
    setModalRequest(null);
    setBusinessName("");
    setLogoUrl("");
    setBrandColor("#c96f4a");
    loadAll();
  }

  function openEdit(b: Business) {
    setEditingBusiness(b);
    setEditName(b.name);
    setEditLogoUrl(b.logoUrl ?? "");
    setEditBrandColor(b.brandColor ?? "#c96f4a");
    setMemberError(null);
    loadMembers(b.id);
    loadQuickBooks(b.id);
    loadCloudDrive(b.id);
    loadMpesa(b.id);
  }

  function loadMpesa(businessId: string) {
    apiFetch<MpesaConnection>(`/admin/businesses/${businessId}/mpesa/connection`).then((conn) => {
      setMpesa(conn);
      setMpesaEnvironment(conn.environment ?? "sandbox");
      setMpesaShortCode(conn.shortCode ?? "");
      setMpesaConsumerKey("");
      setMpesaConsumerSecret("");
      setMpesaPasskey("");
    }).catch(() => setMpesa(null));
  }

  async function handleSaveMpesa(e: FormEvent) {
    e.preventDefault();
    if (!editingBusiness) return;
    setSavingMpesa(true);
    try {
      await apiFetch(`/admin/businesses/${editingBusiness.id}/mpesa/connection`, {
        method: "POST",
        body: JSON.stringify({
          environment: mpesaEnvironment,
          shortCode: mpesaShortCode,
          consumerKey: mpesaConsumerKey,
          consumerSecret: mpesaConsumerSecret,
          passkey: mpesaPasskey
        })
      });
      loadMpesa(editingBusiness.id);
    } finally {
      setSavingMpesa(false);
    }
  }

  function loadMembers(businessId: string) {
    apiFetch<Member[]>(`/admin/businesses/${businessId}/members`).then(setMembers).catch(() => setMembers([]));
  }

  function loadQuickBooks(businessId: string) {
    apiFetch<QuickBooksConnection>(`/admin/businesses/${businessId}/quickbooks/connection`).then(setQb).catch(() => setQb(null));
    apiFetch<SyncLog[]>(`/admin/businesses/${businessId}/quickbooks/sync-logs`).then(setSyncLogs).catch(() => setSyncLogs([]));
  }

  async function handleConnectQuickBooks() {
    if (!editingBusiness) return;
    await apiFetch(`/quickbooks/callback?state=${editingBusiness.id}&code=mock-${Date.now()}`);
    loadQuickBooks(editingBusiness.id);
  }

  async function handleSyncNow() {
    if (!editingBusiness) return;
    setSyncing(true);
    try {
      await apiFetch(`/admin/businesses/${editingBusiness.id}/quickbooks/sync`, { method: "POST" });
      await new Promise((r) => setTimeout(r, 800));
      loadQuickBooks(editingBusiness.id);
    } finally {
      setSyncing(false);
    }
  }

  function loadCloudDrive(businessId: string) {
    apiFetch<CloudDriveConnection>(`/admin/businesses/${businessId}/cloud-drive/connection`).then(setDrive).catch(() => setDrive(null));
    apiFetch<SyncLog[]>(`/admin/businesses/${businessId}/cloud-drive/import-logs`).then(setImportLogs).catch(() => setImportLogs([]));
  }

  async function handleConnectCloudDrive() {
    if (!editingBusiness) return;

    // Mock connector: no real consent screen exists, so the callback is
    // simulated in place and the import runs immediately.
    if (drive?.mock) {
      await apiFetch(`/cloud-drive/callback?state=${editingBusiness.id}&code=mock-${Date.now()}`);
      await handleImportNow();
      return;
    }

    // Real provider: hand the browser to Google. It comes back to this page
    // with ?cloudDrive=connected|error, picked up by the effect below.
    const { url } = await apiFetch<{ url: string }>(
      `/businesses/${editingBusiness.id}/cloud-drive/connect`
    );
    window.location.href = url;
  }

  async function handleImportNow() {
    if (!editingBusiness) return;
    setImporting(true);
    try {
      await apiFetch(`/admin/businesses/${editingBusiness.id}/cloud-drive/import`, { method: "POST" });
      await new Promise((r) => setTimeout(r, 900));
      loadCloudDrive(editingBusiness.id);
    } finally {
      setImporting(false);
    }
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingBusiness) return;
    await apiFetch(`/admin/businesses/${editingBusiness.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: editName, logoUrl: editLogoUrl || undefined, brandColor: editBrandColor || undefined })
    });
    setEditingBusiness(null);
    loadAll();
  }

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (!editingBusiness) return;
    setMemberError(null);
    try {
      await apiFetch(`/admin/businesses/${editingBusiness.id}/members`, {
        method: "POST",
        body: JSON.stringify({ email: newMemberEmail })
      });
      setNewMemberEmail("");
      loadMembers(editingBusiness.id);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Could not add member");
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!editingBusiness) return;
    await apiFetch(`/admin/businesses/${editingBusiness.id}/members/${userId}`, { method: "DELETE" });
    loadMembers(editingBusiness.id);
  }

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl">Businesses</h1>

      <section id="pending-requests" className="scroll-mt-24">
        <h2 className="mb-3 font-serif text-xl">Pending requests</h2>
        <DataTable
          columns={[
            { header: "Client", cell: (r: BusinessRequest) => `${r.requestedBy.name} (${r.requestedBy.email})` },
            { header: "Notes", cell: (r: BusinessRequest) => r.notes ?? "—" },
            { header: "Requested", cell: (r: BusinessRequest) => new Date(r.createdAt).toLocaleDateString() },
            {
              header: "",
              cell: (r: BusinessRequest) => (
                <Button size="sm" onClick={() => setModalRequest(r)}>Create business</Button>
              )
            }
          ]}
          rows={requests}
          keyFor={(r) => r.id}
          emptyMessage="No pending business requests."
        />
      </section>

      <section id="all-businesses" className="scroll-mt-24">
        <h2 className="mb-3 font-serif text-xl">All businesses</h2>
        <DataTable
          columns={[
            {
              header: "Name",
              cell: (b: Business) => (
                <button
                  className="flex items-center gap-3 text-left hover:text-primary"
                  onClick={() => handleViewPortal(b.id)}
                  title={`Open ${b.name}'s portal`}
                >
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: b.brandColor ?? "#999" }}
                    >
                      {b.name.slice(0, 1)}
                    </span>
                  )}
                  {b.name}
                </button>
              )
            },
            { header: "Status", cell: (b: Business) => <Badge variant={b.status === "ACTIVE" ? "success" : "outline"}>{b.status}</Badge> },
            {
              header: "",
              cell: (b: Business) => (
                <div className="flex gap-3">
                  <button className="text-sm text-primary hover:underline" onClick={() => openEdit(b)}>Edit</button>
                  {b.status !== "ARCHIVED" && (
                    <button className="text-sm text-destructive hover:underline" onClick={() => handleArchive(b.id)}>Archive</button>
                  )}
                </div>
              )
            }
          ]}
          rows={businesses}
          keyFor={(b) => b.id}
          emptyMessage="No businesses yet."
        />
      </section>

      <Modal open={!!modalRequest} onClose={() => setModalRequest(null)} title="Create business">
        <form onSubmit={handleCreateBusiness} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            For {modalRequest?.requestedBy.name} ({modalRequest?.requestedBy.email})
          </p>
          <Input placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          <Input placeholder="Logo URL (optional)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Brand color</label>
            <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-9 w-14 rounded border border-border" />
          </div>
          <Button type="submit" className="w-full">Create &amp; notify client</Button>
        </form>
      </Modal>

      <Modal open={!!editingBusiness} onClose={() => setEditingBusiness(null)} title="Edit business">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input placeholder="Business name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
          <Input placeholder="Logo URL (optional)" value={editLogoUrl} onChange={(e) => setEditLogoUrl(e.target.value)} />
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Brand color</label>
            <input type="color" value={editBrandColor} onChange={(e) => setEditBrandColor(e.target.value)} className="h-9 w-14 rounded border border-border" />
          </div>
          <Button type="submit" className="w-full">Save changes</Button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">Members</p>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span>
                  {m.name} ({m.email}) {m.isOwner && <span className="text-xs text-muted-foreground">— owner</span>}
                </span>
                {!m.isOwner && (
                  <button className="text-xs text-destructive hover:underline" onClick={() => handleRemoveMember(m.id)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            {members.length === 0 && <p className="text-sm text-muted-foreground">No members yet.</p>}
          </div>
          <form onSubmit={handleAddMember} className="mt-3 flex gap-2">
            <Input
              placeholder="Add member by email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              type="email"
              required
            />
            <Button type="submit" size="sm" variant="outline">Add</Button>
          </form>
          {memberError && <p className="mt-1 text-sm text-destructive">{memberError}</p>}
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">QuickBooks</p>
          {qb?.connected ? (
            <>
              <p className="text-sm text-muted-foreground">
                Connected (realm {qb.connection?.realmId}). Last synced:{" "}
                {qb.connection?.lastSyncedAt ? new Date(qb.connection.lastSyncedAt).toLocaleString() : "never"}.
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={handleSyncNow} disabled={syncing}>
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
              <div className="mt-3 space-y-1">
                {syncLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs">
                    <span>
                      {new Date(log.startedAt).toLocaleString()} —{" "}
                      {log.status === "SUCCESS" ? `${log.recordsUpserted} records` : log.error ?? log.status}
                    </span>
                    <Badge variant={log.status === "SUCCESS" ? "success" : log.status === "FAILED" ? "destructive" : "outline"}>
                      {log.status}
                    </Badge>
                  </div>
                ))}
                {syncLogs.length === 0 && <p className="text-xs text-muted-foreground">No syncs yet.</p>}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Not connected. Phase 1 uses a mock connector — no real Intuit credentials required yet.
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={handleConnectQuickBooks}>
                Connect QuickBooks (mock)
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">Cloud drive reports</p>
          {driveResult && (
            <div
              className={`mb-3 rounded-lg border p-3 text-sm ${
                driveResult.ok
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-destructive/40 bg-destructive/10 text-foreground"
              }`}
            >
              {driveResult.message}
            </div>
          )}
          {drive?.connected ? (
            <>
              <p className="text-sm text-muted-foreground">
                Connected to {drive.connection?.folderName ?? "a folder"} ({drive.connection?.provider}). Last
                imported:{" "}
                {drive.connection?.lastSyncedAt ? new Date(drive.connection.lastSyncedAt).toLocaleString() : "never"}.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleImportNow} disabled={importing}>
                  {importing ? "Importing…" : "Import now"}
                </Button>
                {/* Needed to move a business to a different Drive account, or to
                    re-resolve its folder after the layout changed. */}
                <Button size="sm" variant="outline" onClick={handleConnectCloudDrive}>
                  {drive.mock ? "Reconnect (mock)" : "Reconnect Google Drive"}
                </Button>
              </div>
              <div className="mt-3 space-y-1">
                {importLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs">
                    <span>
                      {new Date(log.startedAt).toLocaleString()} —{" "}
                      {log.status === "SUCCESS" ? `${log.recordsUpserted} files imported` : log.error ?? log.status}
                    </span>
                    <Badge variant={log.status === "SUCCESS" ? "success" : log.status === "FAILED" ? "destructive" : "outline"}>
                      {log.status}
                    </Badge>
                  </div>
                ))}
                {importLogs.length === 0 && <p className="text-xs text-muted-foreground">No imports yet.</p>}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {drive?.mock
                  ? "Using the offline mock connector — no real credentials required. Connecting simulates a folder of sample reports."
                  : `Connects to the "RelaTax Reports/${editingBusiness?.name ?? ""}" folder in the Google account you authorize. Reports dropped in there are imported and categorized by filename. The subfolder must already exist and match the business name exactly.`}
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={handleConnectCloudDrive}>
                {drive?.mock ? "Connect cloud drive (mock)" : "Connect Google Drive"}
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">M-Pesa (POS)</p>
          <p className="mb-3 text-sm text-muted-foreground">
            {mpesa?.connected
              ? `Configured — shortcode ${mpesa.shortCode} (${mpesa.environment}). Enter new values below to replace them.`
              : "Not configured yet — the business's POS can't take M-Pesa payments until this is set up."}
          </p>
          <form onSubmit={handleSaveMpesa} className="space-y-3">
            <select
              value={mpesaEnvironment}
              onChange={(e) => setMpesaEnvironment(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
            <Input placeholder="Shortcode (Paybill/Till number)" value={mpesaShortCode} onChange={(e) => setMpesaShortCode(e.target.value)} required />
            <Input placeholder="Consumer key" value={mpesaConsumerKey} onChange={(e) => setMpesaConsumerKey(e.target.value)} required />
            <Input placeholder="Consumer secret" value={mpesaConsumerSecret} onChange={(e) => setMpesaConsumerSecret(e.target.value)} required />
            <Input placeholder="Passkey" value={mpesaPasskey} onChange={(e) => setMpesaPasskey(e.target.value)} required />
            <Button type="submit" size="sm" variant="outline" disabled={savingMpesa}>
              {savingMpesa ? "Saving…" : "Save M-Pesa credentials"}
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
