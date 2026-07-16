"use client";

import { useEffect } from "react";

// global-error replaces the root layout when the layout itself throws, so it must
// render its own <html>/<body> and cannot rely on the theme provider or global CSS.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal application error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b0b10",
          color: "#f5f5f7",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#f0c96b",
            }}
          >
            Error crítico
          </p>
          <h1 style={{ margin: "16px 0 0", fontSize: 28, fontWeight: 800 }}>
            La aplicación no pudo cargarse
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.7, color: "#c6c6d6" }}>
            Ocurrió un problema inesperado. Vuelve a intentarlo; si persiste, recarga la página en
            unos minutos.
          </p>
          {error?.digest ? (
            <p style={{ margin: "16px 0 0", fontSize: 12, color: "#8a847a" }}>
              Código de referencia: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 28,
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              backgroundColor: "#f0c96b",
              color: "#0b0b10",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
