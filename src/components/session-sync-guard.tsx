"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { subscribeToLogoutEvent } from "@/lib/auth/session-sync";

const SESSION_CHECK_INTERVAL_MS = 15000;
const PROTECTED_PREFIXES = ["/admin", "/mis-citas", "/perfil"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function SessionSyncGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const forceSignOutView = () => {
      if (isProtectedPath(pathname)) {
        router.push("/");
      }
      router.refresh();
    };

    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        if (response.status === 401) {
          forceSignOutView();
        }
      } catch {
        // Ignore transient network errors during checks.
      }
    };

    const stopSync = subscribeToLogoutEvent(forceSignOutView);
    const intervalId = window.setInterval(checkSession, SESSION_CHECK_INTERVAL_MS);

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };

    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);

    void checkSession();

    return () => {
      stopSync();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    };
  }, [pathname, router]);

  return null;
}

