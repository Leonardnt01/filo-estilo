"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

type Mode = "login" | "register";

const AuthModalCtx = createContext<{
  open: (mode?: Mode) => void;
  close: () => void;
}>({
  open: () => {},
  close: () => {},
});

export function useAuthModal() {
  return useContext(AuthModalCtx);
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");

  const value = useMemo(
    () => ({
      open: (m: Mode = "login") => {
        setMode(m);
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
    }),
    [],
  );

  return (
    <AuthModalCtx.Provider value={value}>
      {children}
      {isOpen && <AuthModal mode={mode} onMode={setMode} onClose={() => setIsOpen(false)} />}
    </AuthModalCtx.Provider>
  );
}

function AuthModal({
  mode,
  onMode,
  onClose,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordScore = Math.min(100, (password.length / 8) * 100);
  const isStrongPassword = password.length >= 8;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "login") {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        setError(json.error ?? "No se pudo iniciar sesión.");
        return;
      }
      toast("Sesión iniciada correctamente");
      onClose();
      if (json.user?.role === "admin" || json.user?.is_staff) {
        router.push("/admin");
      } else {
        router.push("/mis-citas");
      }
      router.refresh();
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo crear la cuenta.");
      return;
    }

    toast("Cuenta creada correctamente. Ahora inicia sesión.");
    setPassword("");
    onMode("login");
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Cerrar modal"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-secondary)] p-1">
          <button
            onClick={() => onMode("login")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              mode === "login" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)]"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => onMode("register")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              mode === "register" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)]"
            }`}
          >
            Registrarme
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="mb-1.5 block text-sm text-[var(--text-secondary)]">Nombre completo</label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-dark !pl-10"
                  placeholder="Tu nombre completo"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm text-[var(--text-secondary)]">Correo electrónico</label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" strokeWidth="2.5" /></svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark !pl-10"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-[var(--text-secondary)]">Contraseña</label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark !pl-10 !pr-10"
                minLength={mode === "register" ? 8 : 1}
                placeholder={mode === "register" ? "Mínimo 8 caracteres" : "••••••••"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-[var(--text-muted)] transition-all hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3l18 18M10.584 10.587a2 2 0 102.828 2.828M9.363 5.365A9.466 9.466 0 0112 5c5.25 0 9.272 3.438 10 7-.242 1.184-.902 2.404-1.916 3.507M6.228 6.228C4.077 7.482 2.523 9.48 2 12c.728 3.562 4.75 7 10 7 2.024 0 3.85-.512 5.365-1.365" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M1.933 12.5C3.64 8.712 7.43 6 12 6s8.36 2.712 10.067 6.5C20.36 16.288 16.57 19 12 19S3.64 16.288 1.933 12.5z" />
                    <circle cx="12" cy="12.5" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {mode === "register" && (
              <div className="mt-2">
                <div className="password-meter">
                  <div
                    className={`password-meter-fill ${isStrongPassword ? "is-strong" : "is-medium"}`}
                    style={{ width: `${passwordScore}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-[var(--text-muted)]">Usa 8+ caracteres.</p>
                  <span className="text-xs text-[var(--text-muted)]">{password.length}/8</span>
                </div>
              </div>
            )}
          </div>

          {error && <div className="alert-error">{error}</div>}

          <button type="submit" disabled={loading} className="btn-gold w-full !rounded-xl !py-3 disabled:opacity-60">
            {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
