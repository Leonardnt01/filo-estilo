import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const redeemSchema = z.object({
  coupon_id: z.string().uuid(),
  appointment_id: z.string().uuid().nullable().optional(),
});

// Marks an active coupon as used once it has been applied to a booking.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = redeemSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_coupons")
    .update({
      status: "used",
      used_at: new Date().toISOString(),
      appointment_id: parsed.data.appointment_id ?? null,
    })
    .eq("id", parsed.data.coupon_id)
    .eq("client_id", user.id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Cupón no disponible o ya canjeado" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
