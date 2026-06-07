import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAvailability } from "@/lib/booking";
import { createClient } from "@/lib/supabase/server";

const availabilitySchema = z.object({
  branch_id: z.uuid(),
  barber_id: z.uuid(),
  service_id: z.uuid(),
  appointment_date: z.iso.date(),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = availabilitySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { branch_id, barber_id, service_id, appointment_date } = parsed.data;
  const supabase = await createClient();
  const availability = await resolveAvailability(supabase, {
    branchId: branch_id,
    barberId: barber_id,
    serviceId: service_id,
    appointmentDate: appointment_date,
  });

  if (!availability.ok) {
    return NextResponse.json({ error: availability.error }, { status: availability.status });
  }

  return NextResponse.json({ ok: true, slots: availability.slots });
}
