import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { hhmmString, isStartBeforeEnd } from "@/lib/validators";

const updateBusinessHoursSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6).optional(),
    start_time: hhmmString.optional(),
    end_time: hhmmString.optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateBusinessHoursSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("business_hours")
    .select("id, start_time, end_time")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Business hours not found" }, { status: 404 });
  }

  const nextStart = parsed.data.start_time ?? existing.start_time;
  const nextEnd = parsed.data.end_time ?? existing.end_time;

  if (!isStartBeforeEnd(nextStart, nextEnd)) {
    return NextResponse.json(
      { error: "start_time must be earlier than end_time" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("business_hours")
    .update(parsed.data)
    .eq("id", id)
    .select("id, barber_id, day_of_week, start_time, end_time, is_active, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_hours")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
