import { NextResponse } from "next/server";
import { z } from "zod";

import {
  appendAuditNote,
  createAppointmentsForSelections,
  validateBookingWindow,
} from "@/lib/booking";
import { getAuthContext } from "@/lib/auth/session";
import { createCulqiCharge, toCulqiAmount } from "@/lib/payments/culqi";
import { buildFullName } from "@/lib/schema-compat";
import { createClient } from "@/lib/supabase/server";

const selectionSchema = z.object({
  service_id: z.uuid(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});

const chargeBookingSchema = z.object({
  token_id: z.string().trim().min(1),
  payment_method: z.enum(["card", "yape"]),
  branch_id: z.uuid(),
  barber_id: z.uuid(),
  appointment_date: z.iso.date(),
  selections: z.array(selectionSchema).min(1).max(10),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  const { user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = chargeBookingSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { token_id, payment_method, branch_id, barber_id, appointment_date, selections, notes } = parsed.data;
  const bookingWindowError = validateBookingWindow(appointment_date);

  if (bookingWindowError) {
    return NextResponse.json({ error: bookingWindowError }, { status: 400 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "Authenticated user email is required for Culqi payments" }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: profile, error: profileError }, { data: services, error: servicesError }] = await Promise.all([
    supabase.from("profiles").select("nombre, apellido").eq("id", user.id).maybeSingle(),
    supabase
      .from("services")
      .select("id, name, price, branch_id")
      .eq("branch_id", branch_id)
      .eq("is_active", true)
      .in("id", [...new Set(selections.map((selection) => selection.service_id))]),
  ]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (servicesError) {
    return NextResponse.json({ error: servicesError.message }, { status: 500 });
  }

  const serviceById = new Map((services ?? []).map((service) => [service.id as string, service]));
  const missingService = selections.find((selection) => !serviceById.has(selection.service_id));

  if (missingService) {
    return NextResponse.json({ error: "One or more services are not available for the selected branch" }, { status: 400 });
  }

  const totalAmount = selections.reduce((sum, selection) => {
    const service = serviceById.get(selection.service_id);
    return sum + Number(service?.price ?? 0);
  }, 0);

  const baseUserNote = notes?.trim() ? ` | ${notes.trim()}` : "";
  const pendingRef = `pay_${Date.now().toString(36).toUpperCase()}`;
  const pendingNote = `[PAGO CULQI EN PROCESO] canal:${payment_method.toUpperCase()} ref:${pendingRef} | Personas:${selections.length} | Horarios del grupo: [${selections.map((selection) => selection.start_time).join(", ")}]${baseUserNote}`;

  const bookingResult = await createAppointmentsForSelections(supabase, {
    client: {
      clientId: user.id,
      customerName: buildFullName(profile, user.email ?? "Cliente"),
      customerPhone: null,
      customerEmail: user.email ?? null,
    },
    branchId: branch_id,
    barberId: barber_id,
    appointmentDate: appointment_date,
    selections: selections.map((selection) => ({
      serviceId: selection.service_id,
      startTime: selection.start_time,
    })),
    notes: pendingNote,
    initialStatus: "pending",
  });

  if (!bookingResult.ok) {
    return NextResponse.json({ error: bookingResult.error }, { status: bookingResult.status });
  }

  try {
    const charge = await createCulqiCharge({
      amount: toCulqiAmount(totalAmount),
      email: user.email,
      source_id: token_id,
      description: `Reserva Filo Estilo ${appointment_date}`,
      metadata: {
        booking_ref: pendingRef,
        payment_method,
        appointment_date,
      },
    });

    const paymentMethodLabel = payment_method === "yape" ? "YAPE" : "TARJETA";
    const paidNote = `[PAGO CULQI] metodo:${paymentMethodLabel} tx:${charge.id}`;

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        notes: `${paidNote} | Personas:${selections.length} | Horarios del grupo: [${selections.map((selection) => selection.start_time).join(", ")}]${baseUserNote}`,
        payment_method: paymentMethodLabel,
        payment_status: "paid",
      })
      .in("id", bookingResult.items.map((item) => item.id))
      .eq("profile_id", user.id);

    if (updateError) {
      return NextResponse.json({
        error: `Charge created successfully in Culqi, but appointment notes could not be updated: ${updateError.message}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      charge_id: charge.id,
      items: bookingResult.items.map((item) => ({
        ...item,
        notes: `${paidNote} | Personas:${selections.length} | Horarios del grupo: [${selections.map((selection) => selection.start_time).join(", ")}]${baseUserNote}`,
      })),
    }, { status: 201 });
  } catch (error) {
    const failureMessage = error instanceof Error ? error.message : "Culqi payment could not be processed";
    const failureNote = `[PAGO CULQI FALLIDO ${new Date().toISOString()}] ${failureMessage}`;

    await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        notes: appendAuditNote(pendingNote, failureNote),
        payment_status: "failed",
      })
      .in("id", bookingResult.items.map((item) => item.id))
      .eq("profile_id", user.id);

    return NextResponse.json({ error: failureMessage }, { status: 402 });
  }
}
