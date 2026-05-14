import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const availabilitySchema = z.object({
  branch_id: z.uuid(),
  barber_id: z.uuid(),
  service_id: z.uuid(),
  appointment_date: z.iso.date(),
});

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = availabilitySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { branch_id, barber_id, service_id, appointment_date } = parsed.data;
  const dayOfWeek = new Date(`${appointment_date}T00:00:00`).getDay();

  const supabase = await createClient();

  const [
    { data: service, error: serviceError },
    { data: hours, error: hoursError },
    { data: barber, error: barberError },
    { data: busy, error: busyError },
  ] = await Promise.all([
      supabase
        .from("services")
        .select("id, duration_minutes, branch_id")
        .eq("id", service_id)
        .eq("branch_id", branch_id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("business_hours")
        .select("start_time, end_time")
        .eq("barber_id", barber_id)
        .eq("branch_id", branch_id)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true),
      supabase
        .from("barbers")
        .select("id")
        .eq("id", barber_id)
        .eq("branch_id", branch_id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("appointments")
        .select("start_time")
        .eq("branch_id", branch_id)
        .eq("barber_id", barber_id)
        .eq("appointment_date", appointment_date)
        .in("status", ["pending", "confirmed", "in_progress"]),
  ]);

  if (serviceError) return NextResponse.json({ error: serviceError.message }, { status: 500 });
  if (hoursError) return NextResponse.json({ error: hoursError.message }, { status: 500 });
  if (barberError) return NextResponse.json({ error: barberError.message }, { status: 500 });
  if (busyError) return NextResponse.json({ error: busyError.message }, { status: 500 });

  if (!service) return NextResponse.json({ error: "Service not found or inactive" }, { status: 400 });
  if (!barber) return NextResponse.json({ error: "Barber not found or inactive for this branch" }, { status: 400 });

  const duration = service.duration_minutes;
  const busySet = new Set((busy ?? []).map((b) => b.start_time.slice(0, 5)));

  const slots: Array<{ start_time: string; end_time: string }> = [];

  for (const h of hours ?? []) {
    let cursor = h.start_time.slice(0, 5);
    const end = h.end_time.slice(0, 5);

    while (addMinutes(cursor, duration) <= end) {
      if (!busySet.has(cursor)) {
        slots.push({ start_time: cursor, end_time: addMinutes(cursor, duration) });
      }
      cursor = addMinutes(cursor, 30);
    }
  }

  return NextResponse.json({ ok: true, slots });
}
