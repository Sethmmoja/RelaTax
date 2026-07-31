import * as Sentry from "@sentry/node";

let initialized = false;

/**
 * Swappable seam like the AI/Email/Drive providers: enabled only when
 * SENTRY_DSN is set, so local dev needs no account. Call once at boot.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({ dsn, environment: process.env.NODE_ENV ?? "development", tracesSampleRate: 0.1 });
  initialized = true;
}

export function captureException(error: unknown): void {
  if (!initialized) return;
  Sentry.captureException(error);
}

export function isSentryEnabled(): boolean {
  return initialized;
}
