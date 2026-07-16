"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for observability without leaking details to the user.
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[var(--bg-primary)] px-6 py-16 text-[var(--text-primary)]">
      <div className="w-full max-w-lg text-center">
        <span className="inline-flex rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Algo salió mal
        </span>

        <h1
          className="mt-6 text-2xl font-bold sm:text-3xl"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Ocurrió un error inesperado
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
          No pudimos completar tu solicitud. Puedes reintentar la acción o volver al inicio. Si el
          problema persiste, inténtalo de nuevo en unos minutos.
        </p>

        {error?.digest ? (
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Código de referencia: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent-hover)]"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:brightness-110"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
