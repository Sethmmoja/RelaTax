"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, DataTable } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";

interface KbChunk {
  id: string;
  content: string;
  sourceType: string;
  businessId: string | null;
  createdAt: string;
}

interface Business {
  id: string;
  name: string;
}

export default function KnowledgeBasePage() {
  const [chunks, setChunks] = useState<KbChunk[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [content, setContent] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadChunks() {
    apiFetch<KbChunk[]>("/admin/knowledge-base").then(setChunks).catch(() => setChunks([]));
  }

  useEffect(() => {
    loadChunks();
    apiFetch<Business[]>("/admin/businesses").then(setBusinesses).catch(() => setBusinesses([]));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/admin/knowledge-base", {
        method: "POST",
        body: JSON.stringify({ content, businessId: businessId || undefined })
      });
      setContent("");
      setBusinessId("");
      loadChunks();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await apiFetch(`/admin/knowledge-base/${id}`, { method: "DELETE" });
    loadChunks();
  }

  function businessName(id: string | null) {
    if (!id) return "Public (website + all clients)";
    return businesses.find((b) => b.id === id)?.name ?? id;
  }

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl">Knowledge Base</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Articles here are embedded and retrieved by the AI assistant on the website, client portal, and WhatsApp.
        Leave "Scope" as public for general FAQs/policies; pick a business to give that client's AI assistant
        private context (e.g. an internal note about their account).
      </p>

      <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Scope</label>
          <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">Public (website + all clients)</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name} (private)</option>)}
          </select>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write the article content the AI should ground its answers in…"
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm"
          required
        />
        <Button type="submit" disabled={submitting}>{submitting ? "Adding…" : "Add to knowledge base"}</Button>
      </form>

      <DataTable
        columns={[
          { header: "Content", cell: (c: KbChunk) => <span className="line-clamp-2 max-w-md">{c.content}</span> },
          { header: "Scope", cell: (c: KbChunk) => businessName(c.businessId) },
          { header: "Source", cell: (c: KbChunk) => c.sourceType },
          { header: "Added", cell: (c: KbChunk) => new Date(c.createdAt).toLocaleDateString() },
          {
            header: "",
            cell: (c: KbChunk) => (
              <button className="text-sm text-destructive hover:underline" onClick={() => handleDelete(c.id)}>Delete</button>
            )
          }
        ]}
        rows={chunks}
        keyFor={(c) => c.id}
        emptyMessage="No knowledge base articles yet."
      />
    </div>
  );
}
