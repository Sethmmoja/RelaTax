"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../../lib/api-client";

function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    apiFetch("/auth/email-verification/confirm", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "verifying") return <p className="mt-6 text-sm text-muted-foreground">Verifying your email…</p>;
  if (status === "success") return <p className="mt-6 text-sm">Your email has been verified.</p>;
  return <p className="mt-6 text-sm text-destructive">This verification link is invalid or has expired.</p>;
}

export default function VerifyEmailPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
      <h1 className="font-serif text-4xl">Email verification</h1>
      <Suspense fallback={null}>
        <VerifyEmailStatus />
      </Suspense>
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
      </p>
    </section>
  );
}
