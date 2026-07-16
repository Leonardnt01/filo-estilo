"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth-session-provider";
import { useToast } from "@/components/toast";
import GoogleAuthButton from "@/components/google-auth-button";

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
  const { setUser } = useAuthSession();
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

    const maskedEmail = email.replace(/(.{2}).*(@.*)/, "$1***$2");

    if (mode === "login") {
      console.log("[auth-modal] login submit", { email: maskedEmail });
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      setLoading(false);
      console.log("[auth-modal] login response", {
        status: res.status,
        ok: res.ok,
        error: json.error ?? null,
      });
      if (!res.ok) {
        setError(json.error ?? "No se pudo iniciar sesión.");
        return;
      }
      setUser(json.user ?? null);
      toast("Sesión iniciada correctamente");
      onClose();
      if (json.user?.role === "admin" || json.user?.is_staff) {
        router.push("/admin");
      } else if (typeof window !== "undefined" && window.location.pathname.includes("/reservar")) {
        window.location.reload();
      } else {
        router.push("/mis-citas");
      }
      router.refresh();
      return;
    }

    console.log("[auth-modal] register submit", {
      email: maskedEmail,
      fullNameLength: fullName.trim().length,
      passwordLength: password.length,
    });
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    console.log("[auth-modal] register response", {
      status: res.status,
      ok: res.ok,
      error: json.error ?? null,
    });
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
      {/* Backdrop */}
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-all duration-300"
        aria-label="Cerrar modal"
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b10]/75 p-7 md:p-8 shadow-[0_0_60px_-15px_rgba(212,168,67,0.3)] backdrop-blur-2xl animate-fade-in-up">
        {/* Top Gold Border Accent */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent rounded-t-2xl" />

        {/* Top Close 'X' Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--text-muted)] transition-all duration-300 hover:rotate-90 hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          aria-label="Cerrar modal"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Branding Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent-border)] shadow-[0_0_15px_rgba(212,168,67,0.1)]">
            <svg className="h-7 w-7 text-[var(--accent)] animate-float" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6a3 3 0 110 6 3 3 0 010-6zm0 12a3 3 0 110 6 3 3 0 010-6zm3-9l9 9m-9 3l9-9M9 12h2" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-[0.15em] text-white" style={{ fontFamily: "var(--font-playfair), serif" }}>
            FILO <span className="text-[var(--accent)]">ESTILO</span>
          </h2>
          <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
            Experiencia Premium de Barbería
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mb-6 flex items-center gap-1.5 rounded-full border border-white/5 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => onMode("login")}
            className={`flex-1 rounded-full py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              mode === "login"
                ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-[0_2px_10px_rgba(212,168,67,0.2)]"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => onMode("register")}
            className={`flex-1 rounded-full py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              mode === "register"
                ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-[0_2px_10px_rgba(212,168,67,0.2)]"
                : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
            }`}
          >
            Registrarme
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-5">
          {mode === "register" && (
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)]">Nombre completo</label>
              <div className="relative group transition-all duration-300">
                <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-black/30 text-[var(--text-primary)] border border-white/10 rounded-xl text-sm transition-all duration-300 placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_15px_rgba(212,168,67,0.15)] focus:bg-black/40"
                  placeholder="Tu nombre completo"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)]">Correo electrónico</label>
            <div className="relative group transition-all duration-300">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" strokeWidth="2.5" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-black/30 text-[var(--text-primary)] border border-white/10 rounded-xl text-sm transition-all duration-300 placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_15px_rgba(212,168,67,0.15)] focus:bg-black/40"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)]">Contraseña</label>
            <div className="relative group transition-all duration-300">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3.5 bg-black/30 text-[var(--text-primary)] border border-white/10 rounded-xl text-sm transition-all duration-300 placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_15px_rgba(212,168,67,0.15)] focus:bg-black/40"
                minLength={mode === "register" ? 8 : 1}
                placeholder={mode === "register" ? "Mínimo 8 caracteres" : "••••••••"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[var(--text-muted)] transition-all hover:border-white/10 hover:bg-white/5 hover:text-white"
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
              <div className="mt-2.5">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isStrongPassword
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : password.length >= 4
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                        : "bg-gradient-to-r from-rose-500 to-orange-400"
                    }`}
                    style={{ width: `${passwordScore}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>Usa 8 o más caracteres</span>
                  <span className="font-semibold text-white/60">{password.length}/8</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="alert-error flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <svg className="h-4.5 w-4.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold mt-2 w-full !rounded-xl !py-3.5 text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-[0_4px_15px_rgba(212,168,67,0.25)] hover:shadow-[0_4px_25px_rgba(212,168,67,0.4)] cursor-pointer"
          >
            {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-5">
          <GoogleAuthButton />
        </div>
      </div>
    </div>
  );
}
