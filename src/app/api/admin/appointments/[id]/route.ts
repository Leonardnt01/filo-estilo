import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

const updateAppointmentSchema = z
  .object({
    status: z
      .enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"])
      .optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateAppointmentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update(parsed.data)
    .eq("id", id)
    .select(
      "id, client_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
