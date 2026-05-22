import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id");

  let servicesQuery = supabase
    .from("services")
    .select("id, name, description, price, duration_minutes, image_url, branch_id")
    .eq("is_active", true)
    .order("name", { ascending: true });

  let barbersQuery = supabase
    .from("barbers")
    .select("id, full_name, specialty, image_url, branch_id")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (branchId) {
    servicesQuery = servicesQuery.eq("branch_id", branchId);
    barbersQuery = barbersQuery.eq("branch_id", branchId);
  }

  const [branchesRes, servicesRes, barbersRes] = await Promise.all([
    supabase
      .from("branches")
      .select("id, name, slug, address, phone, hero_image_url, cover_image_url")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    servicesQuery,
    barbersQuery,
  ]);

  if (branchesRes.error) {
    return NextResponse.json({ error: branchesRes.error.message }, { status: 500 });
  }

  if (servicesRes.error) {
    return NextResponse.json({ error: servicesRes.error.message }, { status: 500 });
  }

  if (barbersRes.error) {
    return NextResponse.json({ error: barbersRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    branches: branchesRes.data,
    services: servicesRes.data,
    barbers: barbersRes.data,
  });
}
