import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function toIsoDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

export async function POST() {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = await createClient();

  const [{ data: profile }, { data: barber }, { data: services, error: servicesError }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
    supabase.from("barbers").select("id, full_name").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase
      .from("services")
      .select("id, duration_minutes")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(3),
  ]);

  if (servicesError) {
    return NextResponse.json({ error: servicesError.message }, { status: 500 });
  }

  if (!barber || !services || services.length === 0) {
    return NextResponse.json({ error: "Se requiere al menos 1 barbero y 1 servicio activo" }, { status: 400 });
  }

  const created: Array<{ id: string; appointment_date: string; start_time: string }> = [];

  for (let idx = 0; idx < services.length; idx += 1) {
    const service = services[idx];
    let booked = false;

    for (let dayOffset = 1; dayOffset <= 21 && !booked; dayOffset += 1) {
      const target = new Date();
      target.setDate(target.getDate() + dayOffset);
      const appointmentDate = toIsoDate(target);
      const dayOfWeek = target.getDay();

      const { data: dayHours, error: dayHoursError } = await supabase
        .from("business_hours")
        .select("start_time, end_time")
        .eq("barber_id", barber.id)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .order("start_time", { ascending: true });

      if (dayHoursError) {
        return NextResponse.json({ error: dayHoursError.message }, { status: 500 });
      }

      if (!dayHours || dayHours.length === 0) continue;

      const { data: busy, error: busyError } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("barber_id", barber.id)
        .eq("appointment_date", appointmentDate)
        .in("status", ["pending", "confirmed", "in_progress"]);

      if (busyError) {
        return NextResponse.json({ error: busyError.message }, { status: 500 });
      }

      const busySet = new Set((busy ?? []).map((b) => b.start_time.slice(0, 5)));

      for (const h of dayHours) {
        let cursor = h.start_time.slice(0, 5);
        const end = h.end_time.slice(0, 5);

        while (addMinutes(cursor, service.duration_minutes) <= end) {
          if (!busySet.has(cursor)) {
            const endTime = addMinutes(cursor, service.duration_minutes);

            const { data: inserted, error: insertError } = await supabase
              .from("appointments")
              .insert({
                client_id: user.id,
                barber_id: barber.id,
                service_id: service.id,
                customer_name: profile?.full_name ?? user.email ?? "Cliente",
                customer_phone: profile?.phone ?? null,
                customer_email: user.email ?? null,
                appointment_date: appointmentDate,
                start_time: cursor,
                end_time: endTime,
                status: "pending",
                notes: "Cita demo",
              })
              .select("id, appointment_date, start_time")
              .single();

            if (!insertError && inserted) {
              created.push(inserted);
              booked = true;
            }
            break;
          }
          cursor = addMinutes(cursor, 30);
        }

        if (booked) break;
      }
    }
  }

  return NextResponse.json({ ok: true, created_count: created.length, items: created });
}
