"use client";

import { FormEvent, useState } from "react";
import { Button, Input } from "@relatax/ui";

export default function BookConsultationPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="font-serif text-4xl md:text-6xl">Book a consultation</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Tell us a bit about your business and we'll follow up to schedule a time.
      </p>

      {submitted ? (
        <div className="mt-10 rounded-lg border border-border bg-card p-6 shadow-soft">
          <p className="font-medium">Thanks — we've received your request.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            A member of the RelaTax team will reach out shortly to confirm a time. You can also{" "}
            <a href="https://wa.me/254115581898" target="_blank" rel="noreferrer" className="text-primary underline">
              message us on WhatsApp
            </a>{" "}
            in the meantime.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
          <Input name="name" placeholder="Full name" required />
          <Input name="email" type="email" placeholder="Email address" required />
          <Input name="phone" placeholder="Phone number" required />
          <Input name="business" placeholder="Business name" />
          <textarea
            name="notes"
            placeholder="What would you like to discuss?"
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button type="submit" size="lg">Request consultation</Button>
        </form>
      )}
    </section>
  );
}
