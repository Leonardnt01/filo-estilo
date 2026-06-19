import { NextResponse } from "next/server";
import { z } from "zod";

const complaintSchema = z.object({
  full_name: z.string().trim().min(5).max(150),
  document_number: z.string().trim().min(6).max(20),
  email: z.email(),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(5).max(250),
  type: z.enum(["reclamo", "queja"]),
  detail: z.string().trim().min(20).max(3000),
  request: z.string().trim().min(10).max(2000),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = complaintSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Formulario inválido. Verifica los campos obligatorios.",
      },
      { status: 400 },
    );
  }

  const code = `LR-${Date.now().toString().slice(-8)}`;
  const receivedAt = new Date().toISOString();

  console.log("[LEGAL][BOOK] complaint registered", {
    code,
    received_at: receivedAt,
    complaint: parsed.data,
  });

  return NextResponse.json({
    ok: true,
    code,
    received_at: receivedAt,
  });
}
