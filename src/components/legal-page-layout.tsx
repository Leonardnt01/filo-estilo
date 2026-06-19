import Link from "next/link";

import { Footer } from "@/components/footer";

type FooterSettings = {
  brand_name?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
};

type BranchContact = {
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

type LegalPageLayoutProps = {
  title: string;
  badge: string;
  description: string;
  children: React.ReactNode;
  footerSettings?: FooterSettings;
  footerBranchContact?: BranchContact | null;
};

export function LegalPageLayout({
  title,
  badge,
  description,
  children,
  footerSettings,
  footerBranchContact,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-16 sm:px-8 lg:px-10">
        <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                {badge}
              </span>
              <h1
                className="mt-4 text-3xl font-bold sm:text-4xl"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                {description}
              </p>
            </div>

            <Link
              href="/reservar"
              className="inline-flex items-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:brightness-110"
            >
              Volver a reservar
            </Link>
          </div>

          <div className="space-y-8 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
            {children}
          </div>
        </div>
      </main>

      <Footer
        initialSettings={footerSettings}
        initialBranchContact={footerBranchContact ?? null}
      />
    </div>
  );
}
