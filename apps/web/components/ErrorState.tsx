"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@relatax/ui";

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Where "go back" should lead; the section's home, not the site's. */
  homeHref: string;
  homeLabel: string;
}

/**
 * Shared body for every route-level error boundary. Says what happened in
 * plain words, offers a retry (Next re-renders the segment) and a way out,
 * and shows the error digest so support can find the server log line —
 * never the stack, which would leak internals to a client's screen.
 */
export function ErrorState({ error, reset, homeHref, homeLabel }: ErrorStateProps) {
  useEffect(() => {
    // Client-side reporting hook: the API reports to Sentry when configured;
    // the browser side stays on the console until a DSN is wired here too.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-20" role="alert">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Something went wrong</p>
      <h1 className="mt-3 font-serif text-4xl md:text-5xl">This page couldn&apos;t load.</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The problem is on our side, not yours — nothing you entered has been lost from your account. Try again, and
        if it keeps happening, tell us and quote the reference below.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href={homeHref}>
          <Button variant="outline">{homeLabel}</Button>
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-8 font-mono text-xs text-muted-foreground">
          Reference: <span className="select-all">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
