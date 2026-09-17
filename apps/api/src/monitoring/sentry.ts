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

export interface ClientErrorReport {
  message: string;
  name?: string;
  stack?: string;
  digest?: string;
  url?: string;
  source: string;
}

/**
 * Reconstructs a browser error as an Error so Sentry groups it by stack,
 * and tags it so client failures are filterable from API ones.
 */
export function captureClientError(report: ClientErrorReport, context: { userAgent?: string }): void {
  if (!initialized) return;
  const error = new Error(report.message);
  error.name = report.name ?? "ClientError";
  if (report.stack) error.stack = report.stack;

  Sentry.withScope((scope) => {
    scope.setTag("runtime", "browser");
    scope.setTag("client_source", report.source);
    if (report.digest) scope.setTag("next_digest", report.digest);
    if (report.url) scope.setContext("page", { url: report.url });
    if (context.userAgent) scope.setContext("browser", { userAgent: context.userAgent });
    Sentry.captureException(error);
  });
}
