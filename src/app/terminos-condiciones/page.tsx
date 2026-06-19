import { LegalPageLayout } from "@/components/legal-page-layout";
import { getPublicHomeData } from "@/lib/public-home";

export default async function TerminosCondicionesPage() {
  const homeData = await getPublicHomeData();

  return (
    <LegalPageLayout
      title="Términos y Condiciones"
      badge="Información legal"
      description="Estos términos regulan el acceso, reserva y pago de servicios publicados por Filo Estilo en esta web."
      footerSettings={homeData.site_settings?.public_footer ?? {}}
      footerBranchContact={homeData.branches?.[0] ?? null}
    >
      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">1. Alcance del servicio</h2>
        <p className="mt-3">
          Filo Estilo ofrece reservas online para servicios de barbería, cuidado personal y atención en sede. La disponibilidad de horarios, especialistas y precios puede variar según sede y fecha.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">2. Proceso de reserva</h2>
        <p className="mt-3">
          El cliente debe seleccionar una sede, uno o más servicios, un especialista disponible y un horario libre. La reserva solo se considera completada cuando el sistema muestra la confirmación correspondiente.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">3. Precios y medios de pago</h2>
        <p className="mt-3">
          Todos los precios se muestran en soles peruanos (PEN). Los pagos en línea son procesados a través de Culqi. Filo Estilo no almacena datos completos de tarjetas ni códigos de seguridad en esta web.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">4. Responsabilidad del cliente</h2>
        <p className="mt-3">
          El cliente es responsable de ingresar datos veraces, revisar el detalle de la reserva antes de pagar y asistir puntualmente a la cita. En caso de información falsa o uso indebido del sistema, la reserva podrá ser anulada.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">5. Contacto</h2>
        <p className="mt-3">
          Para consultas, soporte o coordinación de reservas, el cliente puede comunicarse mediante los canales de contacto visibles en esta web.
        </p>
      </section>
    </LegalPageLayout>
  );
}
