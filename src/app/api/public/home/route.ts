import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SiteSettingsRow = {
  key: string;
  value: {
    brand_name?: string;
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    phone?: string;
    address?: string;
  };
};

export async function GET() {
  let supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  const [branchesRes, servicesRes, featuredRes, testimonialsRes, promotionsRes, settingsRes] = await Promise.all([
    supabase
      .from("branches")
      .select("id, name, slug, address, phone, whatsapp, maps_url, hero_image_url, cover_image_url, is_featured")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("services")
      .select("id, name, description, price, duration_minutes, branch_id")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("featured_services")
      .select("id, branch_id, service_id, title, image_url, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("testimonials")
      .select("id, branch_id, name, title, result, quote, image_url, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("promotions")
      .select("id, branch_id, title, description, discount_percent, image_url, starts_at, ends_at, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("site_settings").select("key, value").in("key", ["public_footer"]),
  ]);

  if (branchesRes.error) return NextResponse.json({ error: branchesRes.error.message }, { status: 500 });
  if (servicesRes.error) return NextResponse.json({ error: servicesRes.error.message }, { status: 500 });
  if (featuredRes.error) return NextResponse.json({ error: featuredRes.error.message }, { status: 500 });
  if (testimonialsRes.error) return NextResponse.json({ error: testimonialsRes.error.message }, { status: 500 });
  if (promotionsRes.error) return NextResponse.json({ error: promotionsRes.error.message }, { status: 500 });
  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });

  const settingsMap = new Map(
    ((settingsRes.data ?? []) as SiteSettingsRow[]).map((row) => [row.key, row.value]),
  );

  const footer = settingsMap.get("public_footer") ?? {};
  const now = Date.now();
  const promotions = (promotionsRes.data ?? []).filter((promo) => {
    const startsAt = promo.starts_at ? Date.parse(promo.starts_at) : null;
    const endsAt = promo.ends_at ? Date.parse(promo.ends_at) : null;
    const isAfterStart = startsAt === null || Number.isNaN(startsAt) || startsAt <= now;
    const isBeforeEnd = endsAt === null || Number.isNaN(endsAt) || endsAt >= now;
    return isAfterStart && isBeforeEnd;
  });

  return NextResponse.json(
    {
      ok: true,
      branches: branchesRes.data ?? [],
      services: servicesRes.data ?? [],
      featured_services: featuredRes.data ?? [],
      testimonials: testimonialsRes.data ?? [],
      promotions,
      site_settings: {
        public_footer: footer,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
