import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-14">
      <h1 className="text-3xl font-semibold">Filo Estilo</h1>
      <p className="mt-3 text-sm text-[#5f6b7a]">
        Plataforma de gestión de citas para barbería. Inicia sesión para administrar el sistema.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link href="/login" className="rounded-lg border p-4 hover:bg-[#eef3fb]">
          <h2 className="font-medium">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-[#5f6b7a]">Accede con tu cuenta para administrar.</p>
        </Link>

        <Link href="/admin/services" className="rounded-lg border p-4 hover:bg-[#eef3fb]">
          <h2 className="font-medium">Panel Admin</h2>
          <p className="mt-1 text-sm text-[#5f6b7a]">Servicios, barberos, horarios y citas.</p>
        </Link>

        <Link href="/mis-citas" className="rounded-lg border p-4 hover:bg-[#eef3fb]">
          <h2 className="font-medium">Mis citas</h2>
          <p className="mt-1 text-sm text-[#5f6b7a]">Revisa tus reservas como cliente.</p>
        </Link>
      </div>
    </main>
  );
}

