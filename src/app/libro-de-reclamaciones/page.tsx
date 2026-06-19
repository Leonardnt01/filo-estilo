import { LibroReclamacionesForm } from "@/components/libro-reclamaciones-form";
import { LegalPageLayout } from "@/components/legal-page-layout";
import { getPublicHomeData } from "@/lib/public-home";

export default async function LibroDeReclamacionesPage() {
  const homeData = await getPublicHomeData();

  return (
    <LegalPageLayout
      title="Libro de Reclamaciones"
      badge="Canal de atención"
      description="Ponemos a tu disposición este canal integrado para registrar reclamos o quejas vinculadas a nuestros servicios, conforme a la atención brindada en esta web."
      footerSettings={homeData.site_settings?.public_footer ?? {}}
      footerBranchContact={homeData.branches?.[0] ?? null}
    >
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Uso del libro</h2>
        <p className="mt-3">
          Este formulario permite registrar incidencias relacionadas con reservas, pagos, atención recibida o cualquier aspecto del servicio ofrecido por Filo Estilo. Una vez enviado, se genera una constancia de registro.
        </p>
      </section>

      <LibroReclamacionesForm />
    </LegalPageLayout>
  );
}
