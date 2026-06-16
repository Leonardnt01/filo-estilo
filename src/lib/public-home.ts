import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SiteSettingsRow = {
  key: string;
  value: Record<string, unknown>;
};

export async function getPublicHomeData() {
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
    supabase.from("site_settings").select("key, value").in("key", ["public_footer", "public_home"]),
  ]);

  if (branchesRes.error) throw new Error(branchesRes.error.message);
  if (servicesRes.error) throw new Error(servicesRes.error.message);
  if (featuredRes.error) throw new Error(featuredRes.error.message);
  if (testimonialsRes.error) throw new Error(testimonialsRes.error.message);
  if (promotionsRes.error) throw new Error(promotionsRes.error.message);
  if (settingsRes.error) throw new Error(settingsRes.error.message);

  const settingsMap = new Map(
    ((settingsRes.data ?? []) as SiteSettingsRow[]).map((row) => [row.key, row.value]),
  );

  const now = Date.now();
  const promotions = (promotionsRes.data ?? []).filter((promo) => {
    const startsAt = promo.starts_at ? Date.parse(promo.starts_at) : null;
    const endsAt = promo.ends_at ? Date.parse(promo.ends_at) : null;
    const isAfterStart = startsAt === null || Number.isNaN(startsAt) || startsAt <= now;
    const isBeforeEnd = endsAt === null || Number.isNaN(endsAt) || endsAt >= now;
    return isAfterStart && isBeforeEnd;
  });

  return {
    ok: true,
    branches: branchesRes.data ?? [],
    services: servicesRes.data ?? [],
    featured_services: featuredRes.data ?? [],
    testimonials: testimonialsRes.data ?? [],
    promotions,
    site_settings: {
      public_footer: settingsMap.get("public_footer") ?? {},
      public_home: settingsMap.get("public_home") ?? {},
    },
  };
}
