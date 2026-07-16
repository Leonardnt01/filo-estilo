import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal-page-layout";
import { getPublicHomeData } from "@/lib/public-home";

export const metadata: Metadata = {
  title: "Política de Cambios y Devoluciones",
  description: "Conoce cómo gestionamos reprogramaciones, anulaciones y devoluciones de tus reservas.",
};

export default async function PoliticaCambiosDevolucionesPage() {
  const homeData = await getPublicHomeData();

  return (
    <LegalPageLayout
      title="Política de Cambios y Devoluciones"
      badge="Política comercial"
      description="Esta política explica cómo se gestionan reprogramaciones, anulaciones y devoluciones vinculadas a reservas realizadas en Filo Estilo."
      footerSettings={homeData.site_settings?.public_footer ?? {}}
      footerBranchContact={homeData.branches?.[0] ?? null}
    >
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">1. Reprogramaciones</h2>
        <p className="mt-3">
          Las reservas pueden solicitar reprogramación con anticipación razonable, sujetas a disponibilidad del especialista y de la sede elegida.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">2. Cancelaciones</h2>
        <p className="mt-3">
          Si el cliente necesita cancelar una cita, debe hacerlo por los canales de atención de Filo Estilo antes de la hora programada. Las cancelaciones fuera de tiempo podrán evaluarse caso por caso.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">3. Devoluciones</h2>
        <p className="mt-3">
          Las devoluciones por pagos realizados en línea estarán sujetas a revisión del caso, validación del estado de la reserva y políticas del medio de pago utilizado. Si corresponde una devolución, esta se tramitará por el mismo canal de pago empleado por el cliente.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">4. Casos no cubiertos</h2>
        <p className="mt-3">
          No procede devolución cuando el servicio fue brindado conforme a la reserva confirmada o cuando la inasistencia del cliente no fue comunicada oportunamente.
        </p>
      </section>
    </LegalPageLayout>
  );
}
