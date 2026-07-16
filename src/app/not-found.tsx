import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada | Filo Estilo",
  description: "La página que buscas no existe o fue movida.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[var(--bg-primary)] px-6 py-16 text-[var(--text-primary)]">
      <div className="w-full max-w-lg text-center">
        <span className="inline-flex rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Error 404
        </span>

        <p
          className="mt-6 bg-gradient-to-b from-[var(--accent-hover)] to-[var(--accent)] bg-clip-text text-7xl font-black leading-none text-transparent sm:text-8xl"
          style={{ fontFamily: "var(--font-playfair), serif" }}
          aria-hidden="true"
        >
          404
        </p>

        <h1
          className="mt-6 text-2xl font-bold sm:text-3xl"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Esta página no existe
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
          La dirección que ingresaste no está disponible o fue movida. Revisa el enlace o vuelve al
          inicio para seguir navegando.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent-hover)]"
          >
            Volver al inicio
          </Link>
          <Link
            href="/reservar"
            className="inline-flex items-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:brightness-110"
          >
            Reservar una cita
          </Link>
        </div>
      </div>
    </main>
  );
}
