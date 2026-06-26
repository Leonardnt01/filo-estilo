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
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const selectionSchema = z.object({
  service_id: z.uuid(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});

const chargeBookingSchema = z.object({
  token_id: z.string().trim().min(1),
  payment_method: z.enum(["card", "yape"]),
  payment_details: z
    .object({
      phone: z.string().trim().min(1).max(30).optional().nullable(),
      card_last4: z.string().trim().min(4).max(8).optional().nullable(),
    })
    .optional()
    .nullable(),
  branch_id: z.uuid(),
  barber_id: z.uuid(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  selections: z.array(selectionSchema).min(1).max(10),
  notes: z.string().trim().max(2000).optional().nullable(),
  promotion_id: z.string().uuid().optional().nullable(),
});

function buildPaidPaymentNote(params: {
  paymentMethod: "card" | "yape";
  chargeId: string;
  amount: number;
  phone?: string | null;
  cardLast4?: string | null;
}) {
  const parts = [
    "[PAGO CULQI]",
    "estado:pagado",
    `metodo:${params.paymentMethod === "yape" ? "YAPE" : "TARJETA"}`,
    `tx:${params.chargeId}`,
    `monto:${params.amount.toFixed(2)}`,
    "moneda:PEN",
  ];

  if (params.paymentMethod === "yape" && params.phone) {
    parts.push(`celular:${params.phone}`);
  }

  if (params.paymentMethod === "card" && params.cardLast4) {
    parts.push(`tarjeta:****${params.cardLast4}`);
  }

  return parts.join(" ");
}

function resolveChargeReference(charge: unknown, fallbackRef: string) {
  if (charge && typeof charge === "object") {
    const candidateMap = charge as Record<string, unknown>;
    const directId = candidateMap.id;
    if (typeof directId === "string" && directId.trim()) {
      return directId;
    }

    const nestedData = candidateMap.data;
    if (nestedData && typeof nestedData === "object") {
      const nestedId = (nestedData as Record<string, unknown>).id;
      if (typeof nestedId === "string" && nestedId.trim()) {
        return nestedId;
      }
    }
  }

  return fallbackRef;
}

async function updateAppointmentNotesAfterCharge(
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
  appointmentIds: string[],
  notes: string,
  paymentMethodLabel: string,
) {
  const attempts = [
    () =>
      supabase
        .from("appointments")
        .update({
          notes,
          status: "confirmed",
          payment_method: paymentMethodLabel,
          payment_status: "paid",
        })
        .in("id", appointmentIds)
        .select("id"),
    () =>
      supabase
        .from("appointments")
        .update({ notes, status: "confirmed" })
        .in("id", appointmentIds)
        .select("id"),
  ] as const;

  let lastError: { message: string } | null = null;

  for (const attempt of attempts) {
    const result = await attempt();
    if (!result.error && (result.data?.length ?? 0) > 0) {
      return null;
    }
    lastError = {
      message:
        result.error?.message ??
        "No se encontró ninguna cita para actualizar después del pago",
    };
  }

  return lastError;
}

async function rollbackFailedCharge(
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
  appointmentIds: string[],
  notes: string,
) {
  const attempts = [
    () =>
      supabase
        .from("appointments")
        .update({
          status: "cancelled",
          notes,
          payment_status: "failed",
        })
        .in("id", appointmentIds)
        .select("id"),
    () =>
      supabase
        .from("appointments")
        .update({
          status: "cancelled",
          notes,
        })
        .in("id", appointmentIds)
        .select("id"),
  ] as const;

  for (const attempt of attempts) {
    const result = await attempt();
    if (!result.error && (result.data?.length ?? 0) > 0) {
      return;
    }
  }
}

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

  const { token_id, payment_method, payment_details, branch_id, barber_id, appointment_date, selections, notes, promotion_id } =
    parsed.data;
  console.log("[CULQI][API] incoming charge booking request", {
    userId: user.id,
    email: user.email,
    payment_method,
    branch_id,
    barber_id,
    appointment_date,
    selections,
    payment_details,
    promotion_id,
  });
  const bookingWindowError = validateBookingWindow(appointment_date);

  if (bookingWindowError) {
    return NextResponse.json({ error: bookingWindowError }, { status: 400 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "Authenticated user email is required for Culqi payments" }, { status: 400 });
  }

  const userSupabase = await createClient();
  const adminSupabase = (() => {
    try {
      return createAdminClient();
    } catch {
      return null;
    }
  })();
  const dbClient = adminSupabase ?? userSupabase;

  const [
    { data: profile, error: profileError },
    { data: services, error: servicesError },
    { data: promotion, error: promotionError }
  ] = await Promise.all([
    dbClient.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
    dbClient
      .from("services")
      .select("id, name, price, branch_id")
      .eq("branch_id", branch_id)
      .eq("is_active", true)
      .in("id", [...new Set(selections.map((selection) => selection.service_id))]),
    promotion_id
      ? dbClient
          .from("promotions")
          .select("id, branch_id, title, discount_percent, is_active, starts_at, ends_at")
          .eq("id", promotion_id)
          .or(`branch_id.eq.${branch_id},branch_id.is.null`)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (servicesError) {
    return NextResponse.json({ error: servicesError.message }, { status: 500 });
  }

  if (promotionError) {
    return NextResponse.json({ error: promotionError.message }, { status: 500 });
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

  let discountPercent = 0;
  let promotionTitle = "";

  if (promotion) {
    const now = Date.now();
    const startsAt = promotion.starts_at ? Date.parse(promotion.starts_at) : null;
    const endsAt = promotion.ends_at ? Date.parse(promotion.ends_at) : null;
    const isAfterStart = startsAt === null || Number.isNaN(startsAt) || startsAt <= now;
    const isBeforeEnd = endsAt === null || Number.isNaN(endsAt) || endsAt >= now;

    if (promotion.is_active && isAfterStart && isBeforeEnd) {
      discountPercent = promotion.discount_percent;
      promotionTitle = promotion.title;
    }
  }

  const discountAmount = Math.round(totalAmount * (discountPercent / 100));
  const chargedAmount = Math.max(0, totalAmount - discountAmount);

  const baseUserNote = notes?.trim() ? ` | ${notes.trim()}` : "";
  const pendingRef = `pay_${Date.now().toString(36).toUpperCase()}`;
  const pendingNote = `[PAGO CULQI EN PROCESO] canal:${payment_method.toUpperCase()} ref:${pendingRef} | Personas:${selections.length} | Horarios del grupo: [${selections.map((selection) => selection.start_time).join(", ")}]${baseUserNote}`;

  const bookingResult = await createAppointmentsForSelections(dbClient, {
    client: {
      clientId: user.id,
      customerName: buildFullName(profile, user.email ?? "Cliente"),
      customerPhone: profile?.phone ?? null,
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
    console.error("[CULQI][API] createAppointmentsForSelections failed", {
      userId: user.id,
      appointment_date,
      barber_id,
      branch_id,
      selections,
      error: bookingResult.error,
      status: bookingResult.status,
    });
    return NextResponse.json({ error: bookingResult.error }, { status: bookingResult.status });
  }

  console.log("[CULQI][API] appointments created before charge", {
    appointmentIds: bookingResult.items.map((item) => item.id),
    items: bookingResult.items,
  });

  try {
    const charge = await createCulqiCharge({
      amount: toCulqiAmount(chargedAmount),
      email: user.email,
      source_id: token_id,
      description: `Reserva Filo Estilo ${appointment_date}`,
      metadata: {
        booking_ref: pendingRef,
        payment_method,
        appointment_date,
      },
    });
    const chargeReference = resolveChargeReference(charge, pendingRef);
    console.log("[CULQI][API] charge created successfully", {
      chargeId: chargeReference,
      payment_method,
      appointmentIds: bookingResult.items.map((item) => item.id),
      chargeResponse: charge,
    });

    const paymentMethodLabel = payment_method === "yape" ? "YAPE" : "TARJETA";
    const paidNote = buildPaidPaymentNote({
      paymentMethod: payment_method,
      chargeId: chargeReference,
      amount: chargedAmount,
      phone: payment_method === "yape" ? payment_details?.phone ?? null : null,
      cardLast4: payment_method === "card" ? payment_details?.card_last4 ?? null : null,
    });

    let promoDetails = "";
    if (promotionTitle) {
      promoDetails = ` | promo:${promotionTitle} (-${discountPercent}%)`;
    }

    const finalNotes = `${paidNote}${promoDetails} | Personas:${selections.length} | Horarios del grupo: [${selections.map((selection) => selection.start_time).join(", ")}]${baseUserNote}`;
    const appointmentIds = bookingResult.items.map((item) => item.id);
    const updateError = await updateAppointmentNotesAfterCharge(
      dbClient,
      appointmentIds,
      finalNotes,
      paymentMethodLabel,
    );

    if (updateError) {
      console.error("[CULQI][API] appointment update after charge failed", {
        appointmentIds,
        updateError,
        finalNotes,
      });
      return NextResponse.json({
        error: `Charge created successfully in Culqi, but appointment notes could not be updated: ${updateError.message}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      charge_id: chargeReference,
      items: bookingResult.items.map((item) => ({
        ...item,
        notes: finalNotes,
      })),
    }, { status: 201 });
  } catch (error) {
    const failureMessage = error instanceof Error ? error.message : "Culqi payment could not be processed";
    console.error("[CULQI][API] charge flow failed", {
      userId: user.id,
      appointment_date,
      branch_id,
      barber_id,
      selections,
      error: failureMessage,
    });
    const failureNote = `[PAGO CULQI FALLIDO ${new Date().toISOString()}] ${failureMessage}`;
    const rollbackNotes = appendAuditNote(pendingNote, failureNote);
    const appointmentIds = bookingResult.items.map((item) => item.id);
    await rollbackFailedCharge(dbClient, appointmentIds, rollbackNotes);

    return NextResponse.json({ error: failureMessage }, { status: 402 });
  }
}
