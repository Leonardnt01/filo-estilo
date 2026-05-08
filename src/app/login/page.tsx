"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      setError(json.error ?? "No se pudo iniciar sesión");
      return;
    }

    setLoading(false);
    if (json.user?.role === "admin") {
      router.push("/admin/services");
      return;
    }

    router.push("/mis-citas");
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 py-14">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-[#5f6b7a]">Usa tu cuenta registrada en Supabase Auth.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border p-5">
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[#0d1b3d] px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}

