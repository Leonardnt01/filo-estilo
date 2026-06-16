"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

export type SessionUser = {
  id?: string;
  email: string;
  role: string | null;
  is_staff?: boolean;
  memberships?: Array<{ branch_id: string; role: string }>;
} | null;

const AuthSessionCtx = createContext<{
  user: SessionUser;
  setUser: (user: SessionUser) => void;
}>({
  user: null,
  setUser: () => {},
});

export function useAuthSession() {
  return useContext(AuthSessionCtx);
}

export function AuthSessionProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: SessionUser;
}) {
  const [user, setUser] = useState<SessionUser>(initialUser);
  const [hydrated, setHydrated] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || fetchedRef.current || user) {
      return;
    }

    const hasSupabaseCookie = document.cookie
      .split(";")
      .map((item) => item.trim())
      .some((cookie) => cookie.startsWith("sb-") && cookie.includes("-auth-token"));

    if (!hasSupabaseCookie) {
      fetchedRef.current = true;
      return;
    }

    fetchedRef.current = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setUser(data.authenticated ? data.user : null);
      })
      .catch(() => {
        setUser(null);
      });
  }, [hydrated, user]);

  const value = useMemo(() => ({ user, setUser }), [user]);

  return <AuthSessionCtx.Provider value={value}>{children}</AuthSessionCtx.Provider>;
}
