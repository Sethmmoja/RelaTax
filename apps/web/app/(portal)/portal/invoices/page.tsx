"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, DataTable, Input, Modal } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useBusiness } from "../../../../lib/business-context";

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
}

interface Invoice {
  id: string;
  customerName: string;
  customerKraPin: string | null;
  status: string;
  currency: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  issuedAt: string | null;
  kraInvoiceNo: string | null;
  cuSerialNumber: string | null;
  qrCodeUrl: string | null;
  document: { id: string } | null;
  lineItems: InvoiceLineItem[];
}

interface InvoiceRequest {
  id: string;
  customerName: string;
  customerKraPin: string | null;
  itemDescription: string;
  amount: string;
  currency: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: "Pending review",
  IN_PROGRESS: "In progress",
  FULFILLED: "Fulfilled",
  REJECTED: "Rejected"
};

export default function PortalInvoicesPage() {
  const { activeBusinessId } = useBusiness();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [detail, setDetail] = useState<Invoice | null>(null);

  const [requestOpen, setRequestOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerKraPin, setCustomerKraPin] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadAll() {
    if (!activeBusinessId) return;
    apiFetch<Invoice[]>(`/businesses/${activeBusinessId}/invoices`).then(setInvoices).catch(() => setInvoices([]));
    apiFetch<InvoiceRequest[]>(`/businesses/${activeBusinessId}/invoice-requests`).then(setRequests).catch(() => setRequests([]));
  }

  useEffect(loadAll, [activeBusinessId]);

  async function handleDownload(documentId: string) {
    const result = await apiFetch<{ url: string }>(`/businesses/${activeBusinessId}/documents/${documentId}/download`);
    window.open(result.url, "_blank");
  }

  async function handleSubmitRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/businesses/${activeBusinessId}/invoice-requests`, {
        method: "POST",
        body: JSON.stringify({
          customerName,
          customerKraPin: customerKraPin || undefined,
          itemDescription,
          amount: Number(amount)
        })
      });
      setRequestOpen(false);
      setCustomerName("");
      setCustomerKraPin("");
      setItemDescription("");
      setAmount("");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit this request");
    } finally {
      setSubmitting(false);
    }
  }

  const openRequests = requests.filter((r) => r.status !== "FULFILLED");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Invoices</h1>
        <Button onClick={() => setRequestOpen(true)}>Request new invoice</Button>
      </div>

      {openRequests.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl">Requests in progress</h2>
          <DataTable
            columns={[
              { header: "Customer", cell: (r: InvoiceRequest) => r.customerName },
              { header: "Item", cell: (r: InvoiceRequest) => r.itemDescription },
              { header: "Amount", cell: (r: InvoiceRequest) => `${r.currency} ${Number(r.amount).toLocaleString()}` },
              { header: "Status", cell: (r: InvoiceRequest) => STATUS_LABEL[r.status] ?? r.status },
              { header: "Requested", cell: (r: InvoiceRequest) => new Date(r.createdAt).toLocaleDateString() },
              {
                header: "",
                cell: (r: InvoiceRequest) =>
                  r.status === "REJECTED" && r.rejectionReason ? (
                    <span className="text-sm text-destructive">{r.rejectionReason}</span>
                  ) : null
              }
            ]}
            rows={openRequests}
            keyFor={(r) => r.id}
            emptyMessage="No requests in progress."
          />
        </section>
      )}

      <section>
        <h2 className="mb-3 font-serif text-xl">Invoices</h2>
        <DataTable
          columns={[
            {
              header: "Customer",
              cell: (i: Invoice) => (
                <button className="text-left text-primary hover:underline" onClick={() => setDetail(i)}>
                  {i.customerName}
                </button>
              )
            },
            { header: "KRA invoice no.", cell: (i: Invoice) => i.kraInvoiceNo ?? "—" },
            { header: "Total", cell: (i: Invoice) => `${i.currency} ${Number(i.total).toLocaleString()}` },
            { header: "Status", cell: (i: Invoice) => i.status },
            { header: "Issued", cell: (i: Invoice) => (i.issuedAt ? new Date(i.issuedAt).toLocaleDateString() : "—") },
            {
              header: "",
              cell: (i: Invoice) =>
                i.document ? (
                  <button className="text-sm text-primary hover:underline" onClick={() => handleDownload(i.document!.id)}>
                    Download
                  </button>
                ) : null
            }
          ]}
          rows={invoices}
          keyFor={(i) => i.id}
          emptyMessage="No invoices yet — request one over WhatsApp or with the button above."
        />
      </section>

      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title="Request new invoice">
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tell us who the invoice is for and what it's for — we'll generate the eTIMS invoice and send it back here
            and on WhatsApp.
          </p>
          <Input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          <Input placeholder="Customer KRA PIN (optional)" value={customerKraPin} onChange={(e) => setCustomerKraPin(e.target.value)} />
          <Input placeholder="Service or product" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} required />
          <Input placeholder="Amount (KES)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Submitting…" : "Submit request"}</Button>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Invoice — ${detail?.customerName ?? ""}`}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <p>KRA PIN: {detail.customerKraPin ?? "—"}</p>
              <p>KRA invoice no.: {detail.kraInvoiceNo ?? "—"}</p>
              <p>CU serial: {detail.cuSerialNumber ?? "—"}</p>
              <p>Status: {detail.status}</p>
            </div>
            <div className="space-y-1 border-t border-border pt-3">
              {detail.lineItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.description} (x{Number(item.quantity)})
                  </span>
                  <span>{detail.currency} {Number(item.lineTotal).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-border pt-3 font-medium">
              <span>Total</span>
              <span>{detail.currency} {Number(detail.total).toLocaleString()}</span>
            </div>
            {detail.document && (
              <Button className="w-full" onClick={() => handleDownload(detail.document!.id)}>Download PDF</Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
