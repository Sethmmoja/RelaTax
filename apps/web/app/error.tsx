"use client";

import { ErrorState } from "../components/ErrorState";

/** Catches render errors on the marketing site and auth pages. */
export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col">
      <ErrorState {...props} homeHref="/" homeLabel="Back to home" />
    </main>
  );
}
