import { NextResponse } from "next/server";
import { z } from "zod";

import { COUPON_ELIGIBILITY_THRESHOLD, COUPON_VALIDITY_DAYS, getPromoByKey } from "@/lib/coupons";
import { createClient } from "@/lib/supabase/server";

const claimSchema = z.object({
  promo_key: z.string().trim().min(1),
});

const COUPON_SELECT = "id, promo_key, title, description, status, expires_at, used_at, created_at";

async function countCompletedAppointments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ count: number; error: string | null }> {
  // The live schema keys appointments by client_id (same as getProfilePageData).
  const { data, error } = await supabase
    .from("appointments")
    .select("status")
    .eq("client_id", userId);
  if (error) return { count: 0, error: error.message };
  return { count: (data ?? []).filter((a) => a.status === "completed").length, error: null };
}

async function expireOverdueCoupons(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  // Free up a promo again once its coupon lapses.
  await supabase
    .from("user_coupons")
    .update({ status: "expired" })
    .eq("client_id", userId)
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await expireOverdueCoupons(supabase, user.id);

  const { data: coupons, error } = await supabase
    .from("user_coupons")
    .select(COUPON_SELECT)
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count: completedCount, error: countError } = await countCompletedAppointments(supabase, user.id);
  if (countError) {
    return NextResponse.json({ error: countError }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    coupons: coupons ?? [],
    eligibility: {
      completedCount,
      threshold: COUPON_ELIGIBILITY_THRESHOLD,
      eligible: completedCount >= COUPON_ELIGIBILITY_THRESHOLD,
      missing: Math.max(0, COUPON_ELIGIBILITY_THRESHOLD - completedCount),
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const promo = getPromoByKey(parsed.data.promo_key);
  if (!promo) {
    return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
  }

  const { count: completedCount, error: countError } = await countCompletedAppointments(supabase, user.id);
  if (countError) {
    return NextResponse.json({ error: countError }, { status: 500 });
  }
  if (completedCount < COUPON_ELIGIBILITY_THRESHOLD) {
    return NextResponse.json(
      {
        error: `Necesitas ${COUPON_ELIGIBILITY_THRESHOLD} citas completadas para reclamar este cupón.`,
        missing: COUPON_ELIGIBILITY_THRESHOLD - completedCount,
      },
      { status: 403 },
    );
  }

  await expireOverdueCoupons(supabase, user.id);

  // Reset rule: a promo can only be re-claimed once its previous coupon was used
  // or expired, so block a second active coupon of the same promo.
  const { data: existing } = await supabase
    .from("user_coupons")
    .select("id")
    .eq("client_id", user.id)
    .eq("promo_key", promo.key)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Ya tienes este cupón activo." }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + COUPON_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: created, error } = await supabase
    .from("user_coupons")
    .insert({
      client_id: user.id,
      promo_key: promo.key,
      title: promo.title,
      description: promo.description,
      status: "active",
      expires_at: expiresAt,
    })
    .select(COUPON_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!created) {
    // Avoid surfacing PostgREST's cryptic "Cannot coerce…" message.
    return NextResponse.json({ error: "No se pudo generar el cupón. Intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, coupon: created }, { status: 201 });
}
