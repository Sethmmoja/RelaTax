"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, DataTable, Input, Modal, PasswordInput } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useAuth } from "../../../../lib/auth-context";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  roleAssignments: { role: { name: string } }[];
}

interface Business {
  id: string;
  name: string;
}

const ROLES = ["SUPER_ADMIN", "ADMIN", "FINANCE", "ACCOUNTANT", "TAX_CONSULTANT", "SUPPORT", "READ_ONLY"];

function AssignmentsModal({ staffUser, onClose }: { staffUser: StaffUser; onClose: () => void }) {
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Business[]>("/admin/businesses"),
      apiFetch<Business[]>(`/users/${staffUser.id}/business-assignments`)
    ]).then(([businesses, assignments]) => {
      setAllBusinesses(businesses);
      setSelectedIds(assignments.map((b) => b.id));
      setLoading(false);
    });
  }, [staffUser.id]);

  function toggle(businessId: string) {
    setSelectedIds((prev) => (prev.includes(businessId) ? prev.filter((id) => id !== businessId) : [...prev, businessId]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch(`/users/${staffUser.id}/business-assignments`, {
        method: "POST",
        body: JSON.stringify({ businessIds: selectedIds })
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Assigned clients — ${staffUser.name}`}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {staffUser.name} can only act on the clients checked below. Super Admins bypass this and see everyone.
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {allBusinesses.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedIds.includes(b.id)} onChange={() => toggle(b.id)} />
                {b.name}
              </label>
            ))}
            {allBusinesses.length === 0 && <p className="text-sm text-muted-foreground">No businesses yet.</p>}
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save assignments"}
          </Button>
        </div>
      )}
    </Modal>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const callerRole = user?.roleAssignments[0]?.role.name ?? "";
  const canManage = ["SUPER_ADMIN", "ADMIN"].includes(callerRole);
  const isSuperAdmin = callerRole === "SUPER_ADMIN";

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [managingUser, setManagingUser] = useState<StaffUser | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(ROLES[2]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadStaff() {
    apiFetch<StaffUser[]>("/users").then(setStaff).catch(() => setStaff([]));
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/users", { method: "POST", body: JSON.stringify({ email, name, password, role }) });
      setEmail("");
      setName("");
      setPassword("");
      loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    await apiFetch(`/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role: newRole }) });
    loadStaff();
  }

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl">Users</h1>

      {canManage && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-6">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Full name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Temporary password</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" minLength={8} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
              {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create staff user"}</Button>
          {error && <p className="w-full text-sm text-destructive">{error}</p>}
        </form>
      )}

      <DataTable
        columns={[
          { header: "Name", cell: (u: StaffUser) => u.name },
          { header: "Email", cell: (u: StaffUser) => u.email },
          {
            header: "Role",
            cell: (u: StaffUser) =>
              canManage ? (
                <select
                  value={u.roleAssignments[0]?.role.name ?? ""}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                </select>
              ) : (
                u.roleAssignments[0]?.role.name.replace(/_/g, " ") ?? "—"
              )
          },
          ...(isSuperAdmin
            ? [
                {
                  header: "Assigned clients",
                  cell: (u: StaffUser) =>
                    u.roleAssignments[0]?.role.name === "SUPER_ADMIN" ? (
                      <span className="text-sm text-muted-foreground">All (bypasses)</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setManagingUser(u)}>
                        Manage
                      </Button>
                    )
                }
              ]
            : [])
        ]}
        rows={staff}
        keyFor={(u) => u.id}
        emptyMessage="No staff users yet."
      />

      {managingUser && <AssignmentsModal staffUser={managingUser} onClose={() => setManagingUser(null)} />}
    </div>
  );
}
