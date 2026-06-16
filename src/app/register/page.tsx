"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Footer } from "@/components/footer";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const passwordScore = Math.min(100, (password.length / 8) * 100);
  const isStrongPassword = password.length >= 8;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      const messageByStatus: Record<number, string> = {
        400: "Datos invalidos. Revisa correo, contrasena minima de 8 caracteres y nombre.",
        409: "Ese correo ya esta registrado. Intenta iniciar sesion.",
        429: "Demasiados intentos. Espera un momento antes de volver a registrarte.",
        500: "No pudimos completar tu registro por un error interno. Intenta de nuevo.",
      };
      setError(messageByStatus[res.status] ?? json.error ?? "No se pudo registrar usuario");
      return;
    }

    setSuccess("Cuenta creada correctamente. Redirigiendo al login...");
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <>
      <main className="flex-1 flex items-center justify-center px-6 py-32">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent-border)] mb-4">
              <svg className="h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Crea tu <span className="text-[var(--accent)]">cuenta</span>
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Registrate para reservar tus citas en la barberia
            </p>
          </div>

          <form onSubmit={onSubmit} className="glass-card p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Nombre completo
              </label>
              <div className="input-icon-wrap with-left-icon">
                <svg className="input-icon-left h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-dark"
                  placeholder="Tu nombre completo"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Correo electronico
              </label>
              <div className="input-icon-wrap with-left-icon">
                <svg className="input-icon-left h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" strokeWidth="2.5" /></svg>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Contrasena
              </label>
              <div className="input-icon-wrap with-left-icon with-right-icon">
                <svg className="input-icon-left h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark"
                  placeholder="Minimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="input-icon-right"
                  aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
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
              <div className="mt-2 flex items-center gap-2">
                <div className="password-meter flex-1">
                  <div
                    className={`password-meter-fill ${isStrongPassword ? "is-strong" : "is-medium"}`}
                    style={{ width: `${passwordScore}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)]">{password.length}/8</span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Recomendado: 8+ caracteres con mayuscula y numero.
              </p>
            </div>

            {error && (
              <div className="alert-error">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="alert-success">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full !rounded-xl !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creando cuenta..." : "Registrarme"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
              Inicia sesion
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
