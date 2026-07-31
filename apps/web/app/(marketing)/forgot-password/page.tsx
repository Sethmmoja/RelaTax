"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@relatax/ui";
import { apiFetch } from "../../../lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
      <h1 className="font-serif text-4xl">Forgot password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your account email and we'll send you a link to reset your password.
      </p>

      {submitted ? (
        <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-soft">
          <p className="text-sm">
            If that email exists, a reset link has been sent. Check your inbox and follow the link to choose a new
            password.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
      </p>
    </section>
  );
}
