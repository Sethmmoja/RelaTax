"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, DataTable, Input, Modal } from "@relatax/ui";
import { apiFetch, getToken } from "../../../../lib/api-client";

interface InvoiceRequest {
  id: string;
  status: string;
  business: { id: string; name: string };
  requestedBy: { id: string; name: string; email: string };
  customerName: string;
  customerKraPin: string | null;
  itemDescription: string;
  amount: string;
  currency: string;
  rejectionReason: string | null;
  createdAt: string;
}

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

const TABS = [
  { value: "PENDING_REVIEW", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "REJECTED", label: "Rejected" }
];

function emptyLineItem(description = "", unitPrice = ""): LineItem {
  return { description, quantity: "1", unitPrice, taxRate: "16" };
}

export default function InvoiceRequestsPage() {
  const [tab, setTab] = useState("PENDING_REVIEW");
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);

  const [fulfillTarget, setFulfillTarget] = useState<InvoiceRequest | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [kraInvoiceNo, setKraInvoiceNo] = useState("");
  const [cuSerialNumber, setCuSerialNumber] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<InvoiceRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  function loadRequests() {
    apiFetch<InvoiceRequest[]>(`/admin/invoice-requests?status=${tab}`)
      .then(setRequests)
      .catch(() => setRequests([]));
  }

  useEffect(loadRequests, [tab]);

  function openFulfill(request: InvoiceRequest) {
    setFulfillTarget(request);
    setLineItems([emptyLineItem(request.itemDescription, request.amount)]);
    setKraInvoiceNo("");
    setCuSerialNumber("");
    setQrCodeUrl("");
    setFile(null);
    setFormError(null);
  }

  function updateLineItem(index: number, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFulfill(e: FormEvent) {
    e.preventDefault();
    if (!fulfillTarget || !file) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "lineItems",
        JSON.stringify(
          lineItems.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRate)
          }))
        )
      );
      formData.append("kraInvoiceNo", kraInvoiceNo);
      if (cuSerialNumber) formData.append("cuSerialNumber", cuSerialNumber);
      if (qrCodeUrl) formData.append("qrCodeUrl", qrCodeUrl);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/admin/invoice-requests/${fulfillTarget.id}/fulfill`,
        { method: "POST", body: formData, headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Could not fulfill this request." }));
        throw new Error(body.message ?? "Could not fulfill this request.");
      }

      setFulfillTarget(null);
      loadRequests();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not fulfill this request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(e: FormEvent) {
    e.preventDefault();
    if (!rejectTarget) return;
    await apiFetch(`/admin/invoice-requests/${rejectTarget.id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason: rejectionReason })
    });
    setRejectTarget(null);
    setRejectionReason("");
    loadRequests();
  }

  const total = lineItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const rate = Number(item.taxRate) || 0;
    return sum + qty * price * (1 + rate / 100);
  }, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Invoice Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clients request eTIMS invoices over WhatsApp. Generate the real invoice in KRA eTIMS yourself, then record
          the result here — the client gets it back automatically on WhatsApp and in their portal.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { header: "Business", cell: (r: InvoiceRequest) => r.business.name },
          { header: "Customer", cell: (r: InvoiceRequest) => r.customerName },
          { header: "KRA PIN", cell: (r: InvoiceRequest) => r.customerKraPin ?? "—" },
          { header: "Item", cell: (r: InvoiceRequest) => r.itemDescription },
          { header: "Amount", cell: (r: InvoiceRequest) => `${r.currency} ${Number(r.amount).toLocaleString()}` },
          { header: "Requested", cell: (r: InvoiceRequest) => new Date(r.createdAt).toLocaleString() },
          ...(tab === "PENDING_REVIEW" || tab === "IN_PROGRESS"
            ? [
                {
                  header: "",
                  cell: (r: InvoiceRequest) => (
                    <div className="flex gap-3">
                      <Button size="sm" onClick={() => openFulfill(r)}>Fulfill</Button>
                      <button className="text-sm text-destructive hover:underline" onClick={() => setRejectTarget(r)}>
                        Reject
                      </button>
                    </div>
                  )
                }
              ]
            : tab === "REJECTED"
              ? [{ header: "Reason", cell: (r: InvoiceRequest) => r.rejectionReason ?? "—" }]
              : [])
        ]}
        rows={requests}
        keyFor={(r) => r.id}
        emptyMessage="No requests in this status."
      />

      <Modal open={!!fulfillTarget} onClose={() => setFulfillTarget(null)} title="Fulfill invoice request">
        <form onSubmit={handleFulfill} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            For {fulfillTarget?.customerName} ({fulfillTarget?.business.name}). Generate the invoice in KRA eTIMS
            first, then enter what it produced below.
          </p>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Line items</p>
            {lineItems.map((item, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(i, { description: e.target.value })}
                  className="min-w-[10rem] flex-1"
                  required
                />
                <Input
                  placeholder="Qty"
                  type="number"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(i, { quantity: e.target.value })}
                  className="w-20"
                  required
                />
                <Input
                  placeholder="Unit price"
                  type="number"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(i, { unitPrice: e.target.value })}
                  className="w-28"
                  required
                />
                <Input
                  placeholder="Tax %"
                  type="number"
                  step="0.01"
                  value={item.taxRate}
                  onChange={(e) => updateLineItem(i, { taxRate: e.target.value })}
                  className="w-20"
                  required
                />
                {lineItems.length > 1 && (
                  <button type="button" className="text-xs text-destructive hover:underline" onClick={() => removeLineItem(i)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addLineItem} className="text-sm text-primary hover:underline">
              + Add line item
            </button>
            <p className="text-sm font-medium">Total: KES {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>

          <Input placeholder="KRA invoice number" value={kraInvoiceNo} onChange={(e) => setKraInvoiceNo(e.target.value)} required />
          <Input placeholder="CU serial number (optional)" value={cuSerialNumber} onChange={(e) => setCuSerialNumber(e.target.value)} />
          <Input placeholder="QR code URL (optional)" value={qrCodeUrl} onChange={(e) => setQrCodeUrl(e.target.value)} />

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">eTIMS invoice PDF</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" required />
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "Fulfill & send to client"}
          </Button>
        </form>
      </Modal>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject invoice request">
        <form onSubmit={handleReject} className="space-y-4">
          <p className="text-sm text-muted-foreground">For {rejectTarget?.customerName}</p>
          <textarea
            placeholder="Reason (shown to the client)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="h-24 w-full rounded-lg border border-border bg-background p-3 text-sm"
            required
            minLength={3}
          />
          <Button type="submit" variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
            Reject
          </Button>
        </form>
      </Modal>
    </div>
  );
}
