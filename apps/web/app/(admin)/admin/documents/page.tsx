"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button, DataTable } from "@relatax/ui";
import { apiFetch, getToken } from "../../../../lib/api-client";

interface Business {
  id: string;
  name: string;
}

interface DocumentRow {
  id: string;
  originalName: string;
  category: string;
  reportType: string | null;
  period: { label: string } | null;
  createdAt: string;
}

const CATEGORIES = ["FINANCIAL_STATEMENT", "INVOICE", "RECEIPT", "EXCEL", "PDF", "DRAFT", "TAX_REPORT", "SUPPORTING", "OTHER"];
const REPORT_TYPES = [
  "FINANCIAL_STATEMENT",
  "PROFIT_AND_LOSS",
  "BALANCE_SHEET",
  "CASH_FLOW",
  "TRIAL_BALANCE",
  "VAT",
  "PAYE",
  "CORPORATION_TAX",
  "RECEIPT",
  "INVOICE",
  "DRAFT",
  "CUSTOM"
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

export default function AdminDocumentsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reportType, setReportType] = useState("");
  const [year, setYear] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState("");
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Business[]>("/admin/businesses").then((rows) => {
      setBusinesses(rows);
      if (rows[0]) setBusinessId(rows[0].id);
    });
  }, []);

  function loadDocuments() {
    if (!businessId) return;
    apiFetch<DocumentRow[]>(`/businesses/${businessId}/documents`).then(setDocuments).catch(() => setDocuments([]));
  }

  useEffect(loadDocuments, [businessId]);

  async function handleDownload(documentId: string) {
    const result = await apiFetch<{ url: string }>(`/businesses/${businessId}/documents/${documentId}/download`);
    window.open(result.url, "_blank");
  }

  async function handleView(documentId: string) {
    const result = await apiFetch<{ url: string }>(`/businesses/${businessId}/documents/${documentId}/view`);
    window.open(result.url, "_blank");
  }

  async function handleDelete(documentId: string) {
    if (!confirm("Delete this document? This can't be undone.")) return;
    try {
      await apiFetch(`/businesses/${businessId}/documents/${documentId}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document.");
    }
  }

  function handleReplaceClick(documentId: string) {
    setReplacingId(documentId);
    replaceInputRef.current?.click();
  }

  async function handleReplaceFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const newFile = e.target.files?.[0];
    e.target.value = "";
    if (!newFile || !replacingId || !businessId) return;

    const formData = new FormData();
    formData.append("file", newFile);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/businesses/${businessId}/documents/${replacingId}/replace`,
        { method: "POST", body: formData, headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error("Replace failed");
      const updated = await res.json();
      setDocuments((prev) => prev.map((d) => (d.id === replacingId ? updated : d)));
    } catch {
      alert("Failed to replace document.");
    } finally {
      setReplacingId(null);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file || !businessId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      if (reportType) formData.append("reportType", reportType);
      if (year) {
        formData.append("periodLabel", year);
        formData.append("periodStart", new Date(Date.UTC(Number(year), 0, 1)).toISOString());
        formData.append("periodEnd", new Date(Date.UTC(Number(year), 11, 31)).toISOString());
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/businesses/${businessId}/documents`,
        { method: "POST", body: formData, headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error("Upload failed");
      const doc = await res.json();
      setDocuments((prev) => [doc, ...prev]);
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  const visibleDocuments = filterType ? documents.filter((d) => d.reportType === filterType) : documents;

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl">Documents</h1>

      <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-6">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Business</label>
          <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Report type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">Not a report</option>
            {REPORT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">No year</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">File</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" required />
        </div>
        <Button type="submit" disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</Button>
      </form>

      <div className="flex items-end gap-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Report type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">All</option>
            {REPORT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>

      <DataTable
        columns={[
          { header: "Name", cell: (d: DocumentRow) => d.originalName },
          { header: "Category", cell: (d: DocumentRow) => d.category.replace(/_/g, " ") },
          { header: "Report type", cell: (d: DocumentRow) => d.reportType?.replace(/_/g, " ") ?? "—" },
          { header: "Period", cell: (d: DocumentRow) => d.period?.label ?? "—" },
          { header: "Uploaded", cell: (d: DocumentRow) => new Date(d.createdAt).toLocaleDateString() },
          {
            header: "",
            cell: (d: DocumentRow) => (
              <div className="flex items-center gap-3">
                <button className="text-primary hover:underline" onClick={() => handleView(d.id)}>View</button>
                <button className="text-primary hover:underline" onClick={() => handleDownload(d.id)}>Download</button>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => handleReplaceClick(d.id)}
                  aria-label="Replace document"
                  title="Replace"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(d.id)}
                  aria-label="Delete document"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          }
        ]}
        rows={visibleDocuments}
        keyFor={(d) => d.id}
        emptyMessage="No documents uploaded for this business yet."
      />

      <input ref={replaceInputRef} type="file" className="hidden" onChange={handleReplaceFileSelected} />
    </div>
  );
}
