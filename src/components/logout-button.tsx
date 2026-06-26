"use client";

import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth-session-provider";
import { broadcastLogoutEvent } from "@/lib/auth/session-sync";

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const { setUser } = useAuthSession();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    broadcastLogoutEvent();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      title={collapsed ? "Salir" : undefined}
      className={`flex items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 ${
        collapsed ? "w-12 h-12 p-0 shrink-0 self-center" : "px-4 py-2 text-sm w-full"
      }`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {!collapsed && <span>Salir</span>}
    </button>
  );
}
