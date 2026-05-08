import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";

const navItems = [
  { href: "/admin/services", label: "Servicios" },
  { href: "/admin/barbers", label: "Barberos" },
  { href: "/admin/business-hours", label: "Horarios" },
  { href: "/admin/appointments", label: "Citas" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Panel Admin</h1>
          <p className="text-sm text-[#5f6b7a]">Gestión operativa de Filo Estilo</p>
        </div>
        <LogoutButton />
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-md border px-3 py-1.5 text-sm hover:bg-[#eef3fb]">
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}


