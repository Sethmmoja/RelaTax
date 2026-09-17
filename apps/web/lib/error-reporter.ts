const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Source = "error-boundary" | "window-error" | "unhandled-rejection";

// One report per distinct error per page load. A render error inside a
// loop, or a rejection that repeats on a timer, must not become a flood —
// the API throttles too, but there's no point sending what will be dropped.
const reported = new Set<string>();
const MAX_REPORTS_PER_PAGE = 5;

/**
 * Sends a browser failure to the API, which forwards it to Sentry alongside
 * server errors. Fire-and-forget with `keepalive`, so a report survives the
 * page being torn down by a reload or navigation right after the error.
 * Never throws: an error reporter that can itself error is a second bug.
 */
export function reportClientError(error: unknown, source: Source, extra: { digest?: string } = {}): void {
  if (typeof window === "undefined") return;
  try {
    const err = normalise(error);
    const key = `${err.name}:${err.message}`;
    if (reported.has(key) || reported.size >= MAX_REPORTS_PER_PAGE) return;
    reported.add(key);

    const body = JSON.stringify({
      message: err.message.slice(0, 500),
      name: err.name.slice(0, 200),
      stack: err.stack?.slice(0, 8000),
      digest: extra.digest,
      url: window.location.href.slice(0, 2000),
      source,
      occurredAt: Date.now()
    });

    void fetch(`${API_URL}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).catch(() => undefined);
  } catch {
    // Deliberately swallowed — see above.
  }
}

function normalise(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) return { name: error.name || "Error", message: error.message || "(no message)", stack: error.stack };
  if (typeof error === "string") return { name: "Error", message: error };
  try {
    return { name: "NonError", message: JSON.stringify(error).slice(0, 500) };
  } catch {
    return { name: "NonError", message: String(error) };
  }
}

let listenersInstalled = false;

/**
 * Catches what React boundaries can't: failures in event handlers, timers
 * and promises. Installed once per page load from the root layout.
 */
export function installGlobalErrorListeners(): void {
  if (typeof window === "undefined" || listenersInstalled) return;
  listenersInstalled = true;

  window.addEventListener("error", (event) => {
    // Resource load failures (a missing image) also fire "error" on window,
    // with no `error` object — those aren't script failures, skip them.
    if (!event.error) return;
    reportClientError(event.error, "window-error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportClientError(event.reason, "unhandled-rejection");
  });
}
