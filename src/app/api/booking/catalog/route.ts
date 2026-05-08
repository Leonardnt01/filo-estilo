import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const [servicesRes, barbersRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, price, duration_minutes")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("barbers")
      .select("id, full_name, specialty, image_url")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
  ]);

  if (servicesRes.error) {
    return NextResponse.json({ error: servicesRes.error.message }, { status: 500 });
  }

  if (barbersRes.error) {
    return NextResponse.json({ error: barbersRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    services: servicesRes.data,
    barbers: barbersRes.data,
  });
}
