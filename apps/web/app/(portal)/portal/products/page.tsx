"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, DataTable, Input, Modal } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useBusiness } from "../../../../lib/business-context";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  unitPrice: string;
  taxRate: string;
  quantityOnHand: string;
  reorderPoint: string | null;
  isService: boolean;
  status: string;
}

const emptyForm = { name: "", sku: "", unitPrice: "", taxRate: "16", quantityOnHand: "0", reorderPoint: "", isService: false };

export default function PortalProductsPage() {
  const { activeBusinessId } = useBusiness();
  const [products, setProducts] = useState<Product[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [editing, setEditing] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState("");
  const [stockReason, setStockReason] = useState("RESTOCK");
  const [stockNote, setStockNote] = useState("");
  const [stockError, setStockError] = useState<string | null>(null);

  function loadProducts() {
    if (!activeBusinessId) return;
    apiFetch<Product[]>(`/businesses/${activeBusinessId}/products`).then(setProducts).catch(() => setProducts([]));
  }

  useEffect(loadProducts, [activeBusinessId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await apiFetch(`/businesses/${activeBusinessId}/products`, {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        sku: form.sku || undefined,
        unitPrice: Number(form.unitPrice),
        taxRate: Number(form.taxRate),
        quantityOnHand: Number(form.quantityOnHand || 0),
        reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
        isService: form.isService
      })
    });
    setCreateOpen(false);
    setForm(emptyForm);
    loadProducts();
  }

  function openEdit(product: Product) {
    setEditing(product);
    setEditForm({
      name: product.name,
      sku: product.sku ?? "",
      unitPrice: product.unitPrice,
      taxRate: product.taxRate,
      quantityOnHand: product.quantityOnHand,
      reorderPoint: product.reorderPoint ?? "",
      isService: product.isService
    });
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    await apiFetch(`/businesses/${activeBusinessId}/products/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editForm.name,
        sku: editForm.sku || undefined,
        unitPrice: Number(editForm.unitPrice),
        taxRate: Number(editForm.taxRate),
        reorderPoint: editForm.reorderPoint ? Number(editForm.reorderPoint) : undefined,
        isService: editForm.isService
      })
    });
    setEditing(null);
    loadProducts();
  }

  async function handleToggleStatus(product: Product) {
    await apiFetch(`/businesses/${activeBusinessId}/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: product.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE" })
    });
    loadProducts();
  }

  function openStockAdjust(product: Product) {
    setStockTarget(product);
    setStockDelta("");
    setStockReason("RESTOCK");
    setStockNote("");
    setStockError(null);
  }

  async function handleAdjustStock(e: FormEvent) {
    e.preventDefault();
    if (!stockTarget) return;
    setStockError(null);
    try {
      await apiFetch(`/businesses/${activeBusinessId}/products/${stockTarget.id}/stock-adjustments`, {
        method: "POST",
        body: JSON.stringify({ delta: Number(stockDelta), reason: stockReason, note: stockNote || undefined })
      });
      setStockTarget(null);
      loadProducts();
    } catch (err) {
      setStockError(err instanceof Error ? err.message : "Could not adjust stock");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Products</h1>
        <Button onClick={() => setCreateOpen(true)}>Add product</Button>
      </div>

      <DataTable
        columns={[
          { header: "Name", cell: (p: Product) => p.name },
          { header: "SKU", cell: (p: Product) => p.sku ?? "—" },
          { header: "Price", cell: (p: Product) => `KES ${Number(p.unitPrice).toLocaleString()}` },
          { header: "Tax %", cell: (p: Product) => `${Number(p.taxRate)}%` },
          {
            header: "Stock",
            cell: (p: Product) =>
              p.isService
                ? "N/A (service)"
                : `${Number(p.quantityOnHand).toLocaleString()}${
                    p.reorderPoint && Number(p.quantityOnHand) <= Number(p.reorderPoint) ? " ⚠ low" : ""
                  }`
          },
          {
            header: "Status",
            cell: (p: Product) => (
              <button className="text-sm hover:underline" onClick={() => handleToggleStatus(p)}>
                {p.status}
              </button>
            )
          },
          {
            header: "",
            cell: (p: Product) => (
              <div className="flex gap-3">
                <button className="text-sm text-primary hover:underline" onClick={() => openEdit(p)}>Edit</button>
                {!p.isService && (
                  <button className="text-sm text-primary hover:underline" onClick={() => openStockAdjust(p)}>
                    Adjust stock
                  </button>
                )}
              </div>
            )
          }
        ]}
        rows={products}
        keyFor={(p) => p.id}
        emptyMessage="No products yet — add your first one to start selling from the till."
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add product">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="SKU (optional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Input placeholder="Unit price (KES)" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
          <Input placeholder="Tax rate %" type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} required />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={form.isService} onChange={(e) => setForm({ ...form, isService: e.target.checked })} />
            This is a service (no stock tracking)
          </label>
          {!form.isService && (
            <>
              <Input placeholder="Starting quantity" type="number" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: e.target.value })} />
              <Input placeholder="Reorder point (optional)" type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} />
            </>
          )}
          <Button type="submit" className="w-full">Add product</Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit product">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input placeholder="Product name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          <Input placeholder="SKU (optional)" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
          <Input placeholder="Unit price (KES)" type="number" value={editForm.unitPrice} onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })} required />
          <Input placeholder="Tax rate %" type="number" value={editForm.taxRate} onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })} required />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={editForm.isService} onChange={(e) => setEditForm({ ...editForm, isService: e.target.checked })} />
            This is a service (no stock tracking)
          </label>
          {!editForm.isService && (
            <Input placeholder="Reorder point (optional)" type="number" value={editForm.reorderPoint} onChange={(e) => setEditForm({ ...editForm, reorderPoint: e.target.value })} />
          )}
          <Button type="submit" className="w-full">Save changes</Button>
        </form>
      </Modal>

      <Modal open={!!stockTarget} onClose={() => setStockTarget(null)} title="Adjust stock">
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {stockTarget?.name} — current stock: {stockTarget && Number(stockTarget.quantityOnHand).toLocaleString()}
          </p>
          <Input
            placeholder="Change (e.g. 10 to add, -2 to remove)"
            type="number"
            value={stockDelta}
            onChange={(e) => setStockDelta(e.target.value)}
            required
          />
          <select
            value={stockReason}
            onChange={(e) => setStockReason(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="RESTOCK">Restock</option>
            <option value="ADJUSTMENT">Correction / adjustment</option>
          </select>
          <Input placeholder="Note (optional)" value={stockNote} onChange={(e) => setStockNote(e.target.value)} />
          {stockError && <p className="text-sm text-destructive">{stockError}</p>}
          <Button type="submit" className="w-full">Save adjustment</Button>
        </form>
      </Modal>
    </div>
  );
}
