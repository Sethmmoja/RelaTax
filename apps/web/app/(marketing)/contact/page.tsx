"use client";

import { FormEvent, useState } from "react";
import { Button, Input } from "@relatax/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const SERVICES = [
  "Accounting & Bookkeeping",
  "Financial Reporting",
  "Tax Compliance & Advisory",
  "Payroll",
  "Budgeting & Forecasting",
  "Outsourced Finance Function"
];

const faqs = [
  { q: "What is fractional accounting?", a: "You get senior accounting, tax and payroll expertise on a part-time basis — sized to your business's actual needs, instead of hiring a full-time finance team." },
  { q: "Can I access my reports on WhatsApp?", a: "Yes — once you're a client, our WhatsApp AI Assistant lets you pull reports, check tax balances, and download invoices/receipts directly from a chat, after verifying your identity." },
  { q: "Do you integrate with QuickBooks?", a: "Yes, we connect to your existing QuickBooks Online account and sync your financial data automatically into your RelaTax reports and dashboards." },
  { q: "Can one account manage multiple businesses?", a: "Yes — your client portal supports multiple businesses, each with its own dashboard, documents, and reports. New businesses are set up after a short consultation." },
  { q: "Is my financial data secure?", a: "Yes. All data is encrypted in transit and at rest, access is role-based, and every action is recorded in an audit log." }
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleService(service: string) {
    setServices((prev) => (prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (services.length === 0) {
      setError("Select at least one service you're interested in.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          company,
          sector,
          services,
          message: message || undefined
        })
      });
      if (!res.ok) throw new Error("Could not send your message. Please try again.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="font-serif text-4xl md:text-6xl">Contact RelaTax</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Tell us about your business below and we'll get back to you — or find our direct details in the footer.
      </p>

      <div id="tell-us-about-your-business" className="mt-10 scroll-mt-24 rounded border border-border bg-card p-6 shadow-soft md:p-8">
        <h2 className="font-serif text-2xl">Tell us about your business</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A few details so we can point you to the right service from the start.
        </p>

        {submitted ? (
          <p className="mt-8 text-sm text-primary">
            Thanks — we've received your message and will get back to you shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} required />
            </div>
            <Input
              placeholder="Sector / type of business (e.g. retail, logistics, NGO)"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              required
            />

            <div>
              <label className="mb-2 block text-sm font-medium">Which services are you interested in?</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {SERVICES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={services.includes(s)} onChange={() => toggleService(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <textarea
              placeholder="Anything else we should know? (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}
      </div>

      <div className="mt-20">
        <h2 className="font-serif text-3xl">Frequently asked questions</h2>
        <div className="mt-8 divide-y divide-border">
          {faqs.map((f) => (
            <div key={f.q} className="py-6">
              <p className="font-medium">{f.q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
