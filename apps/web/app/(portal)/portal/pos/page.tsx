"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button, Modal } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useBusiness } from "../../../../lib/business-context";

interface Product {
  id: string;
  name: string;
  unitPrice: string;
  taxRate: string;
  quantityOnHand: string;
  isService: boolean;
  status: string;
}

interface CartLine {
  product: Product;
  quantity: number;
}

interface Sale {
  id: string;
  total: string;
  paymentStatus: string;
  changeGiven: string | null;
  mpesaReceiptNumber: string | null;
  document: { id: string } | null;
}

function money(n: number) {
  return `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PortalPosPage() {
  const { activeBusinessId } = useBusiness();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [method, setMethod] = useState<"CASH" | "MPESA">("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Sale | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function loadProducts() {
    if (!activeBusinessId) return;
    apiFetch<Product[]>(`/businesses/${activeBusinessId}/products`)
      .then((rows) => setProducts(rows.filter((p) => p.status === "ACTIVE")))
      .catch(() => setProducts([]));
  }

  useEffect(loadProducts, [activeBusinessId]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const subtotal = cart.reduce((sum, l) => sum + l.quantity * Number(l.product.unitPrice), 0);
  const taxTotal = cart.reduce((sum, l) => sum + l.quantity * Number(l.product.unitPrice) * (Number(l.product.taxRate) / 100), 0);
  const total = subtotal + taxTotal;
  const change = Number(cashReceived || 0) - total;

  function openCheckout() {
    setCheckoutOpen(true);
    setCustomerName("");
    setMethod("CASH");
    setCashReceived("");
    setCustomerPhone("");
    setError(null);
    setResult(null);
  }

  function closeCheckout() {
    setCheckoutOpen(false);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  function pollSale(saleId: string) {
    pollRef.current = setInterval(async () => {
      const sale = await apiFetch<Sale>(`/businesses/${activeBusinessId}/sales/${saleId}`);
      if (sale.paymentStatus !== "PENDING") {
        if (pollRef.current) clearInterval(pollRef.current);
        setResult(sale);
        setSubmitting(false);
        if (sale.paymentStatus === "PAID") {
          setCart([]);
          loadProducts();
        }
      }
    }, 2000);
  }

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const lineItems = cart.map((l) => ({ productId: l.product.id, quantity: l.quantity }));
      if (method === "CASH") {
        const sale = await apiFetch<Sale>(`/businesses/${activeBusinessId}/sales`, {
          method: "POST",
          body: JSON.stringify({ customerName: customerName || undefined, lineItems, cashReceived: Number(cashReceived) })
        });
        setResult(sale);
        setSubmitting(false);
        setCart([]);
        loadProducts();
      } else {
        const sale = await apiFetch<Sale>(`/businesses/${activeBusinessId}/sales/mpesa`, {
          method: "POST",
          body: JSON.stringify({ customerName: customerName || undefined, customerPhone, lineItems })
        });
        setResult(sale);
        pollSale(sale.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setSubmitting(false);
    }
  }

  async function handleDownloadReceipt(documentId: string) {
    const res = await apiFetch<{ url: string }>(`/businesses/${activeBusinessId}/documents/${documentId}/download`);
    window.open(res.url, "_blank");
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">POS</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => {
              const outOfStock = !p.isService && Number(p.quantityOnHand) <= 0;
              return (
                <button
                  key={p.id}
                  disabled={outOfStock}
                  onClick={() => addToCart(p)}
                  className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{money(Number(p.unitPrice))}</p>
                  {!p.isService && <p className="text-xs text-muted-foreground">{outOfStock ? "Out of stock" : `${p.quantityOnHand} in stock`}</p>}
                </button>
              );
            })}
            {products.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">No active products — add some in Products first.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-3 font-serif text-lg">Cart</p>
          <div className="space-y-2">
            {cart.map((line) => (
              <div key={line.product.id} className="flex items-center justify-between text-sm">
                <div>
                  <p>{line.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.quantity} x {money(Number(line.product.unitPrice))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="h-6 w-6 rounded border border-border" onClick={() => changeQuantity(line.product.id, -1)}>-</button>
                  <span>{line.quantity}</span>
                  <button className="h-6 w-6 rounded border border-border" onClick={() => changeQuantity(line.product.id, 1)}>+</button>
                  <button className="text-xs text-destructive hover:underline" onClick={() => removeLine(line.product.id)}>Remove</button>
                </div>
              </div>
            ))}
            {cart.length === 0 && <p className="text-sm text-muted-foreground">Cart is empty — click a product to add it.</p>}
          </div>

          {cart.length > 0 && (
            <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{money(taxTotal)}</span></div>
              <div className="flex justify-between font-medium"><span>Total</span><span>{money(total)}</span></div>
              <Button className="mt-3 w-full" onClick={openCheckout}>Checkout</Button>
            </div>
          )}
        </div>
      </div>

      <Modal open={checkoutOpen} onClose={closeCheckout} title="Checkout">
        {!result ? (
          <form onSubmit={handleCheckout} className="space-y-4">
            <p className="text-sm font-medium">Total: {money(total)}</p>
            <input
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMethod("CASH")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${method === "CASH" ? "border-primary text-primary" : "border-border"}`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setMethod("MPESA")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${method === "MPESA" ? "border-primary text-primary" : "border-border"}`}
              >
                M-Pesa
              </button>
            </div>

            {method === "CASH" ? (
              <>
                <input
                  type="number"
                  placeholder="Cash received (KES)"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  required
                />
                {cashReceived && <p className="text-sm text-muted-foreground">Change: {money(Math.max(0, change))}</p>}
              </>
            ) : (
              <input
                placeholder="Customer phone (254XXXXXXXXX)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                required
              />
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Processing…" : method === "CASH" ? "Complete sale" : "Send M-Pesa prompt"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-sm">
            {result.paymentStatus === "PENDING" && (
              <p className="text-muted-foreground">Waiting for the customer to complete the M-Pesa prompt on their phone…</p>
            )}
            {result.paymentStatus === "PAID" && (
              <>
                <p className="font-medium text-primary">Payment received{result.mpesaReceiptNumber ? ` — M-Pesa receipt ${result.mpesaReceiptNumber}` : ""}.</p>
                {result.changeGiven && Number(result.changeGiven) > 0 && <p>Change due: {money(Number(result.changeGiven))}</p>}
                {result.document && (
                  <Button className="w-full" onClick={() => handleDownloadReceipt(result.document!.id)}>Download receipt</Button>
                )}
              </>
            )}
            {result.paymentStatus === "FAILED" && <p className="text-destructive">Payment failed or was cancelled.</p>}
            <Button variant="outline" className="w-full" onClick={closeCheckout}>Close</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
