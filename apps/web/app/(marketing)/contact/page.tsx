"use client";

import { FormEvent, useState } from "react";
import { Button, Input } from "@relatax/ui";
import { faqs } from "../../../lib/faqs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const SERVICES = [
  "Accounting & Bookkeeping",
  "Financial Reporting",
  "Tax Compliance & Advisory",
  "Payroll",
  "Budgeting & Forecasting",
  "Outsourced Finance Function"
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
  // Bot traps, checked server-side: a field people never see, and when the
  // form was rendered (a submission seconds after render wasn't typed).
  const [website, setWebsite] = useState("");
  const [formRenderedAt] = useState(() => Date.now());

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
          message: message || undefined,
          website: website || undefined,
          formRenderedAt
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
          <form onSubmit={handleSubmit} className="relative mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Your name" htmlFor="contact-name">
                <Input id="contact-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Email address" htmlFor="contact-email">
                <Input id="contact-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Field>
              <Field label="Phone" hint="optional" htmlFor="contact-phone">
                <Input id="contact-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="Company name" htmlFor="contact-company">
                <Input id="contact-company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} required />
              </Field>
            </div>
            <Field label="Sector / type of business" hint="e.g. retail, logistics, NGO" htmlFor="contact-sector">
              <Input id="contact-sector" value={sector} onChange={(e) => setSector(e.target.value)} required />
            </Field>

            {/* Honeypot: hidden from people (and from the accessibility tree),
                filled in by form-stuffing bots. */}
            <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

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

            <Field label="Anything else we should know?" hint="optional" htmlFor="contact-message">
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </Field>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
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

/**
 * A visible label above each control. Placeholder-only fields lose their
 * name the moment someone starts typing, and assistive tech doesn't treat a
 * placeholder as a label.
 */
function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
        {hint ? <span className="ml-1.5 font-normal text-muted-foreground">({hint})</span> : null}
      </label>
      {children}
    </div>
  );
}
