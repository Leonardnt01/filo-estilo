import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const appointmentStatus = z.enum([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

const createAppointmentSchema = z.object({
  branch_id: z.uuid(),
  barber_id: z.uuid(),
  service_id: z.uuid(),
  appointment_date: z.iso.date(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  notes: z.string().trim().max(2000).optional().nullable(),
});

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const { user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);
  const statusParam = searchParams.get("status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  if (statusParam) {
    const parsedStatus = appointmentStatus.safeParse(statusParam);
    if (!parsedStatus.success) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }
  }

  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select(
      "id, client_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
    )
    .eq("client_id", user.id)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(limit);

  if (statusParam) query = query.eq("status", statusParam);
  if (dateFrom) query = query.gte("appointment_date", dateFrom);
  if (dateTo) query = query.lte("appointment_date", dateTo);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: data.length, items: data });
}

export async function POST(request: Request) {
  const { user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createAppointmentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { branch_id, barber_id, service_id, appointment_date, start_time, notes } = parsed.data;
  const today = new Date();
  const todayIso = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);
  const maxIso = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).toISOString().slice(0, 10);

  if (appointment_date < todayIso) {
    return NextResponse.json({ error: "Appointment date cannot be in the past" }, { status: 400 });
  }

  if (appointment_date > maxIso) {
    return NextResponse.json({ error: "Appointment date exceeds booking window (60 days)" }, { status: 400 });
  }

  const supabase = await createClient();

  const [
    { data: service, error: serviceError },
    { data: barber, error: barberError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("duration_minutes, branch_id")
      .eq("id", service_id)
      .eq("branch_id", branch_id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("barbers")
      .select("id")
      .eq("id", barber_id)
      .eq("branch_id", branch_id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
  ]);

  if (serviceError) {
    return NextResponse.json({ error: serviceError.message }, { status: 500 });
  }
  if (barberError) {
    return NextResponse.json({ error: barberError.message }, { status: 500 });
  }
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!service) {
    return NextResponse.json({ error: "Service not found or inactive" }, { status: 400 });
  }
  if (!barber) {
    return NextResponse.json({ error: "Barber not found or inactive for this branch" }, { status: 400 });
  }

  const endTime = addMinutes(start_time, service.duration_minutes);

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      client_id: user.id,
      branch_id,
      barber_id,
      service_id,
      customer_name: profile?.full_name ?? user.email ?? "Cliente",
      customer_phone: profile?.phone ?? null,
      customer_email: user.email ?? null,
      appointment_date,
      start_time,
      end_time: endTime,
      status: "pending",
      notes: notes ?? null,
    })
    .select(
      "id, client_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Selected slot is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
