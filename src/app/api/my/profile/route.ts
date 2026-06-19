import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeProfileForClient } from "@/lib/schema-compat";
import { createClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(6).max(25).nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("status, appointment_date")
    .eq("profile_id", user.id);

  if (appointmentsError) {
    return NextResponse.json({ error: appointmentsError.message }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const stats = {
    total: appointments.length,
    completed: appointments.filter((a) => a.status === "completed").length,
    pending: appointments.filter((a) => ["pending", "confirmed", "in_progress"].includes(a.status)).length,
    upcoming: appointments.filter(
      (a) => ["pending", "confirmed", "in_progress"].includes(a.status) && a.appointment_date >= today,
    ).length,
  };

  return NextResponse.json({
    ok: true,
    profile: normalizeProfileForClient(profile, user),
    stats,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updateData: { full_name?: string; phone?: string | null } = {};
  if (typeof parsed.data.full_name !== "undefined") {
    updateData.full_name = parsed.data.full_name;
  }
  if (typeof parsed.data.phone !== "undefined") {
    updateData.phone = parsed.data.phone;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "At least one field is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select("id, full_name, phone, role, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: normalizeProfileForClient(data, user) });
}

