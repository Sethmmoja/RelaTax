"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, DataTable, Input, Modal } from "@relatax/ui";
import { apiFetch, getToken } from "../../../../../lib/api-client";

interface Business {
  id: string;
  name: string;
}

interface EmployeeDocument {
  id: string;
  label: string;
  document: { id: string; originalName: string };
}

interface Employee {
  id: string;
  name: string;
  email: string;
  kraPin: string | null;
  nssfNo: string | null;
  shifNo: string | null;
  nationalId: string | null;
  staffNo: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  basicSalary: string;
  status: string;
  documents: EmployeeDocument[];
}

const emptyForm = {
  name: "",
  email: "",
  kraPin: "",
  nssfNo: "",
  shifNo: "",
  nationalId: "",
  staffNo: "",
  bankName: "",
  bankAccountNumber: "",
  basicSalary: ""
};

export default function PayrollEmployeesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [editing, setEditing] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [docTarget, setDocTarget] = useState<Employee | null>(null);
  const [docLabel, setDocLabel] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);

  useEffect(() => {
    apiFetch<Business[]>("/admin/businesses").then((rows) => {
      setBusinesses(rows);
      if (rows[0]) setBusinessId(rows[0].id);
    });
  }, []);

  function loadEmployees() {
    if (!businessId) return;
    apiFetch<Employee[]>(`/businesses/${businessId}/employees`).then(setEmployees).catch(() => setEmployees([]));
  }

  useEffect(loadEmployees, [businessId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await apiFetch(`/businesses/${businessId}/employees`, {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        kraPin: form.kraPin || undefined,
        nssfNo: form.nssfNo || undefined,
        shifNo: form.shifNo || undefined,
        nationalId: form.nationalId || undefined,
        staffNo: form.staffNo || undefined,
        bankName: form.bankName || undefined,
        bankAccountNumber: form.bankAccountNumber || undefined,
        basicSalary: Number(form.basicSalary)
      })
    });
    setCreateOpen(false);
    setForm(emptyForm);
    loadEmployees();
  }

  function openEdit(employee: Employee) {
    setEditing(employee);
    setEditForm({
      name: employee.name,
      email: employee.email,
      kraPin: employee.kraPin ?? "",
      nssfNo: employee.nssfNo ?? "",
      shifNo: employee.shifNo ?? "",
      nationalId: employee.nationalId ?? "",
      staffNo: employee.staffNo ?? "",
      bankName: employee.bankName ?? "",
      bankAccountNumber: employee.bankAccountNumber ?? "",
      basicSalary: employee.basicSalary
    });
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    await apiFetch(`/businesses/${businessId}/employees/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editForm.name,
        email: editForm.email,
        kraPin: editForm.kraPin || undefined,
        nssfNo: editForm.nssfNo || undefined,
        shifNo: editForm.shifNo || undefined,
        nationalId: editForm.nationalId || undefined,
        staffNo: editForm.staffNo || undefined,
        bankName: editForm.bankName || undefined,
        bankAccountNumber: editForm.bankAccountNumber || undefined,
        basicSalary: Number(editForm.basicSalary)
      })
    });
    setEditing(null);
    loadEmployees();
  }

  async function handleToggleStatus(employee: Employee) {
    await apiFetch(`/businesses/${businessId}/employees/${employee.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
    });
    loadEmployees();
  }

  async function handleUploadDocument(e: FormEvent) {
    e.preventDefault();
    if (!docTarget || !docFile) return;
    setDocUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("label", docLabel);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/businesses/${businessId}/employees/${docTarget.id}/documents`,
        { method: "POST", body: formData, headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error("Upload failed");
      setDocTarget(null);
      setDocLabel("");
      setDocFile(null);
      loadEmployees();
    } finally {
      setDocUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Employees</h1>
        <Button onClick={() => setCreateOpen(true)}>Add employee</Button>
      </div>

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

      <DataTable
        columns={[
          { header: "Staff No.", cell: (e: Employee) => e.staffNo ?? "—" },
          { header: "Name", cell: (e: Employee) => e.name },
          { header: "Email", cell: (e: Employee) => e.email },
          { header: "National ID", cell: (e: Employee) => e.nationalId ?? "—" },
          { header: "Basic salary", cell: (e: Employee) => `KES ${Number(e.basicSalary).toLocaleString()}` },
          {
            header: "Status",
            cell: (e: Employee) => (
              <button className="text-sm hover:underline" onClick={() => handleToggleStatus(e)}>
                {e.status}
              </button>
            )
          },
          { header: "Documents", cell: (e: Employee) => e.documents.length },
          {
            header: "",
            cell: (e: Employee) => (
              <div className="flex gap-3">
                <button className="text-sm text-primary hover:underline" onClick={() => openEdit(e)}>Edit</button>
                <button className="text-sm text-primary hover:underline" onClick={() => setDocTarget(e)}>Add document</button>
              </div>
            )
          }
        ]}
        rows={employees}
        keyFor={(e) => e.id}
        emptyMessage="No employees yet for this business."
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add employee">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input
            placeholder="National ID number"
            value={form.nationalId}
            onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
            required
          />
          <p className="-mt-2 text-xs text-muted-foreground">Used to password-protect this employee's payslip PDF.</p>
          <Input placeholder="Staff number (auto-generated if left blank)" value={form.staffNo} onChange={(e) => setForm({ ...form, staffNo: e.target.value })} />
          <Input placeholder="KRA PIN (optional)" value={form.kraPin} onChange={(e) => setForm({ ...form, kraPin: e.target.value })} />
          <Input placeholder="NSSF number (optional)" value={form.nssfNo} onChange={(e) => setForm({ ...form, nssfNo: e.target.value })} />
          <Input placeholder="SHIF number (optional)" value={form.shifNo} onChange={(e) => setForm({ ...form, shifNo: e.target.value })} />
          <Input placeholder="Bank name (optional)" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          <Input placeholder="Bank account number (optional)" value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} />
          <Input placeholder="Basic salary (KES)" type="number" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: e.target.value })} required />
          <Button type="submit" className="w-full">Add employee</Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit employee">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input placeholder="Full name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          <Input placeholder="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
          <Input
            placeholder="National ID number"
            value={editForm.nationalId}
            onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })}
            required
          />
          <p className="-mt-2 text-xs text-muted-foreground">Used to password-protect this employee's payslip PDF.</p>
          <Input placeholder="Staff number" value={editForm.staffNo} onChange={(e) => setEditForm({ ...editForm, staffNo: e.target.value })} />
          <Input placeholder="KRA PIN (optional)" value={editForm.kraPin} onChange={(e) => setEditForm({ ...editForm, kraPin: e.target.value })} />
          <Input placeholder="NSSF number (optional)" value={editForm.nssfNo} onChange={(e) => setEditForm({ ...editForm, nssfNo: e.target.value })} />
          <Input placeholder="SHIF number (optional)" value={editForm.shifNo} onChange={(e) => setEditForm({ ...editForm, shifNo: e.target.value })} />
          <Input placeholder="Bank name (optional)" value={editForm.bankName} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} />
          <Input placeholder="Bank account number (optional)" value={editForm.bankAccountNumber} onChange={(e) => setEditForm({ ...editForm, bankAccountNumber: e.target.value })} />
          <Input placeholder="Basic salary (KES)" type="number" value={editForm.basicSalary} onChange={(e) => setEditForm({ ...editForm, basicSalary: e.target.value })} required />
          <Button type="submit" className="w-full">Save changes</Button>
        </form>
      </Modal>

      <Modal open={!!docTarget} onClose={() => setDocTarget(null)} title="Add employee document">
        <form onSubmit={handleUploadDocument} className="space-y-4">
          <p className="text-sm text-muted-foreground">For {docTarget?.name}</p>
          <Input placeholder="Label (e.g. Contract, P9, ID copy)" value={docLabel} onChange={(e) => setDocLabel(e.target.value)} required />
          <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} className="text-sm" required />
          <Button type="submit" className="w-full" disabled={docUploading}>{docUploading ? "Uploading…" : "Upload"}</Button>
        </form>
        {docTarget && docTarget.documents.length > 0 && (
          <div className="mt-4 space-y-1 border-t border-border pt-4">
            {docTarget.documents.map((d) => (
              <p key={d.id} className="text-sm text-muted-foreground">{d.label}: {d.document.originalName}</p>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
