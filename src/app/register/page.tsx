"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
      }),
    });

    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "No se pudo registrar usuario");
      return;
    }

    setSuccess("Cuenta creada correctamente. Ahora inicia sesión.");
    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 py-14">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <p className="mt-2 text-sm text-[#5f6b7a]">Regístrate para reservar tus citas en la barbería.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border bg-white p-5">
        <div>
          <label className="block text-sm font-medium">Nombre completo</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">{success}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[#0d1b3d] px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creando cuenta..." : "Registrarme"}
        </button>
      </form>

      <p className="mt-4 text-sm text-[#5f6b7a]">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-[#0d1b3d] underline">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
