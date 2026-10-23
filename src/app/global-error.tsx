"use client";

/**
 * Global error boundary — renders when the root layout itself fails.
 * Deliberately self-contained (inline styles, no CSS or component
 * imports) so it cannot fail for the same reason as the layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (typeof console !== "undefined") {
    console.error("Global application error:", error);
  }

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f8fa",
          color: "#172033",
        }}
      >
        <div
          role="alert"
          style={{
            textAlign: "center",
            padding: "2rem",
            maxWidth: "28rem",
          }}
        >
          <h1
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              margin: "0 0 0.5rem",
            }}
          >
            Application error
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#64748b",
              margin: "0 0 1.5rem",
            }}
          >
            The application encountered an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#172033",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
