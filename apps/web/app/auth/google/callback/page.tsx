"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../lib/auth-context";

export default function GoogleCallbackPage() {
  const { loginWithAccessToken } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("accessToken");

    // Strip the token out of the URL/history immediately — it should never
    // persist in browser history once we've read it.
    window.history.replaceState(null, "", window.location.pathname);

    if (!accessToken) {
      setError("Google sign-in didn't complete. Please try again.");
      return;
    }

    loginWithAccessToken(accessToken)
      .then(() => router.replace("/portal/dashboard"))
      .catch(() => setError("Google sign-in didn't complete. Please try again."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-20 text-center">
      {/* Every page needs exactly one h1, including transient ones — it is what
          a screen reader announces on arrival. aria-live means the change from
          "Signing you in" to an error is spoken rather than silently swapped. */}
      <h1 aria-live="polite" className="font-serif text-2xl">
        {error ? "Sign-in didn't complete" : "Signing you in…"}
      </h1>
      {error && (
        <>
          <p className="mt-3 text-sm text-destructive">{error}</p>
          <a href="/login" className="mt-4 text-sm text-primary hover:underline">
            Back to sign in
          </a>
        </>
      )}
    </section>
  );
}
