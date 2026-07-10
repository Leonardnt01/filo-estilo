import { NextResponse } from "next/server";
import { z } from "zod";

import { createAppointmentsForSelections, resolveAvailability, validateBookingWindow } from "@/lib/booking";
import { getAuthContext } from "@/lib/auth/session";
import {
  buildFullName,
  normalizeAppointmentForClient,
} from "@/lib/schema-compat";
import { createClient } from "@/lib/supabase/server";

const appointmentStatus = z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"]);

const createAppointmentSchema = z.object({
  branch_id: z.uuid(),
  barber_id: z.uuid(),
  service_id: z.uuid(),
  appointment_date: z.iso.date(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  notes: z.string().trim().max(2000).optional().nullable(),
  initial_status: z.enum(["pending", "cancelled"]).optional(),
});

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
  const selectVariants: string[] = [
    "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at",
    "id, profile_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at, people, payment_method, payment_status, total_price",
    "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
    "id, profile_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status, notes, created_at, updated_at, people, payment_method, payment_status, total_price",
  ];

  let data: Record<string, unknown>[] | null = null;
  let error: { message: string } | null = null;

  for (const select of selectVariants) {
    let query = supabase
      .from("appointments")
      .select(select)
      .order("appointment_date", { ascending: false })
      .limit(limit);

    if (select.includes("client_id")) {
      query = query.eq("client_id", user.id).order("start_time", { ascending: false });
    } else {
      query = query.eq("profile_id", user.id).order("appointment_time", { ascending: false });
    }

    if (statusParam) query = query.eq("status", statusParam);
    if (dateFrom) query = query.gte("appointment_date", dateFrom);
    if (dateTo) query = query.lte("appointment_date", dateTo);

    const res = await query;
    if (!res.error) {
      data = (res.data ?? []) as unknown as Record<string, unknown>[];
      error = null;
      break;
    }
    error = { message: res.error.message };
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((item) => normalizeAppointmentForClient(item));

  return NextResponse.json({ ok: true, count: items.length, items });
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

  const { branch_id, barber_id, service_id, appointment_date, start_time, notes, initial_status } = parsed.data;
  const bookingWindowError = validateBookingWindow(appointment_date);
  if (bookingWindowError) {
    return NextResponse.json({ error: bookingWindowError }, { status: 400 });
  }

  const supabase = await createClient();

  const [{ data: profile, error: profileError }, availability] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
    resolveAvailability(supabase, {
      branchId: branch_id,
      barberId: barber_id,
      serviceId: service_id,
      appointmentDate: appointment_date,
    }),
  ]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!availability.ok) {
    return NextResponse.json({ error: availability.error }, { status: availability.status });
  }

  const selectedSlot = availability.slots.find((slot) => slot.start_time === start_time);
  if (!selectedSlot) {
    return NextResponse.json({ error: "Selected slot is not available" }, { status: 409 });
  }

  const created = await createAppointmentsForSelections(supabase, {
    client: {
      clientId: user.id,
      customerName: buildFullName(profile, user.email ?? "Cliente"),
      customerPhone: profile?.phone ?? null,
      customerEmail: user.email ?? null,
    },
    branchId: branch_id,
    barberId: barber_id,
    appointmentDate: appointment_date,
    selections: [{ serviceId: service_id, startTime: start_time }],
    notes: notes ?? null,
    initialStatus: initial_status ?? "pending",
  });

  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  return NextResponse.json({ ok: true, item: created.items[0] ?? null }, { status: 201 });
}
