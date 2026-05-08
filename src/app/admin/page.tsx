import Link from "next/link";

export default function AdminIndexPage() {
  return (
    <main className="rounded-lg border p-6">
      <h2 className="text-xl font-semibold">Módulos del panel</h2>
      <p className="mt-2 text-sm text-[#5f6b7a]">Selecciona un módulo para comenzar a gestionar.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/services" className="rounded-md border px-3 py-1.5 text-sm hover:bg-[#eef3fb]">
          Servicios
        </Link>
        <Link href="/admin/barbers" className="rounded-md border px-3 py-1.5 text-sm hover:bg-[#eef3fb]">
          Barberos
        </Link>
        <Link href="/admin/business-hours" className="rounded-md border px-3 py-1.5 text-sm hover:bg-[#eef3fb]">
          Horarios
        </Link>
        <Link href="/admin/appointments" className="rounded-md border px-3 py-1.5 text-sm hover:bg-[#eef3fb]">
          Citas
        </Link>
      </div>
    </main>
  );
}

