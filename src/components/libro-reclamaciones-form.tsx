"use client";

import { useMemo, useState } from "react";

type ComplaintResult = {
  code: string;
  received_at: string;
};

const complaintTypeOptions = [
  { value: "reclamo", label: "Reclamo" },
  { value: "queja", label: "Queja" },
];

export function LibroReclamacionesForm() {
  const [fullName, setFullName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("reclamo");
  const [detail, setDetail] = useState("");
  const [request, setRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplaintResult | null>(null);

  const formattedDate = useMemo(() => {
    if (!result) return "";
    return new Date(result.received_at).toLocaleString("es-PE", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }, [result]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/legal/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          document_number: documentNumber,
          email,
          phone,
          address,
          type,
          detail,
          request,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        received_at?: string;
      };

      if (!response.ok || !body.code || !body.received_at) {
        throw new Error(body.error || "No se pudo registrar tu solicitud en este momento.");
      }

      setResult({
        code: body.code,
        received_at: body.received_at,
      });

      setFullName("");
      setDocumentNumber("");
      setEmail("");
      setPhone("");
      setAddress("");
      setType("reclamo");
      setDetail("");
      setRequest("");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo registrar tu solicitud en este momento.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)]/20 p-4 text-sm text-[var(--text-secondary)]">
        <p className="font-semibold text-[var(--text-primary)]">Canal oficial integrado en la web</p>
        <p className="mt-2 leading-6">
          Completa este formulario para registrar un reclamo o queja. Al enviarlo, el sistema te entregará un código de constancia para seguimiento.
        </p>
      </div>

      {result && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="font-semibold">Solicitud registrada correctamente</p>
          <p className="mt-2">Código de constancia: <strong>{result.code}</strong></p>
          <p className="mt-1">Fecha de registro: {formattedDate}</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Nombre completo</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input-dark" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Documento de identidad</span>
          <input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required className="input-dark" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Correo electrónico</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-dark" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Teléfono</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="input-dark" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Tipo</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input-dark" required>
            {complaintTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Dirección</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} required className="input-dark" />
        </label>

        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Detalle de lo ocurrido</span>
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} required className="input-dark min-h-32 resize-y" />
        </label>

        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Pedido del consumidor</span>
          <textarea value={request} onChange={(e) => setRequest(e.target.value)} required className="input-dark min-h-24 resize-y" />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Registrando solicitud..." : "Registrar en Libro de Reclamaciones"}
          </button>
        </div>
      </form>
    </div>
  );
}
