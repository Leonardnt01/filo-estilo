"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setLoading(false);
    router.push("/login");
  }

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-[#eef3fb] disabled:opacity-50"
      type="button"
    >
      {loading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}

