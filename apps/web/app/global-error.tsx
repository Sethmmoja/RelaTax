"use client";

/**
 * Last resort: only reached when the root layout itself fails, which means
 * no fonts, theme or design system are available. Plain HTML on purpose.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "4rem 1.5rem", color: "#2d2521" }}>
        <main style={{ maxWidth: 560, margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 500 }}>RelaTax couldn&apos;t load.</h1>
          <p style={{ lineHeight: 1.5 }}>Something failed before the page could start. Reloading usually fixes it.</p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.25rem",
              background: "#be4a1b",
              color: "#fff",
              border: 0,
              borderRadius: 4,
              fontSize: "1rem",
              cursor: "pointer"
            }}
          >
            Reload
          </button>
          {error.digest ? <p style={{ marginTop: "2rem", fontSize: "0.75rem", opacity: 0.7 }}>Reference: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
