import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PublicCatalogResult = {
  ok: true;
  branches: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
  barbers: Array<Record<string, unknown>>;
};

function getEmptyPublicCatalogData(): PublicCatalogResult {
  return {
    ok: true,
    branches: [],
    services: [],
    barbers: [],
  };
}

async function loadPublicCatalogDataWithClient(
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
  branchId?: string,
): Promise<PublicCatalogResult> {
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

  const [branchesResRaw, servicesResRaw, barbersResRaw] = await Promise.all([
    supabase
      .from("branches")
      .select("id, name, slug, address, phone, whatsapp, maps_url, hero_image_url, cover_image_url")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    servicesQuery,
    barbersQuery,
  ]);

  let branchesRes = branchesResRaw;
  let servicesRes = servicesResRaw;
  const barbersRes = barbersResRaw;

  if (!branchesRes.error && (branchesRes.data?.length ?? 0) === 0) {
    branchesRes = await supabase
      .from("branches")
      .select("id, name, slug, address, phone, whatsapp, maps_url, hero_image_url, cover_image_url")
      .order("created_at", { ascending: true });
  }

  if (servicesRes.error?.message?.toLowerCase().includes("services.image_url")) {
    let fallbackServicesQuery = supabase
      .from("services")
      .select("id, name, description, price, duration_minutes, branch_id")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (branchId) {
      fallbackServicesQuery = fallbackServicesQuery.eq("branch_id", branchId);
    }

    const fallbackServices = await fallbackServicesQuery;
    servicesRes = {
      ...fallbackServices,
      data: (fallbackServices.data ?? []).map((item) => ({ ...item, image_url: null })),
    } as typeof servicesResRaw;
  }

  if (branchesRes.error) throw new Error(branchesRes.error.message);
  if (servicesRes.error) throw new Error(servicesRes.error.message);
  if (barbersRes.error) throw new Error(barbersRes.error.message);

  const activeServiceBranchIds = new Set(
    (servicesRes.data ?? [])
      .map((service) => service.branch_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );

  const publicBranches = (branchesRes.data ?? []).filter((branch) => {
    if (!activeServiceBranchIds.has(branch.id)) return false;
    const slug = (branch.slug ?? "").toLowerCase();
    const name = (branch.name ?? "").toLowerCase();
    if (slug.includes("demo") || name.includes("demo")) return false;
    return true;
  });

  return {
    ok: true,
    branches: publicBranches,
    services: servicesRes.data ?? [],
    barbers: barbersRes.data ?? [],
  };
}

const getPublicCatalogDataImpl = cache(async (branchId?: string) => {
  try {
    return await loadPublicCatalogDataWithClient(createAdminClient(), branchId);
  } catch (adminError) {
    try {
      return await loadPublicCatalogDataWithClient(await createClient(), branchId);
    } catch (serverError) {
      console.error("[public-catalog] failed to load public catalog", {
        branchId: branchId ?? null,
        adminError: adminError instanceof Error ? adminError.message : String(adminError),
        serverError: serverError instanceof Error ? serverError.message : String(serverError),
      });
      return getEmptyPublicCatalogData();
    }
  }
});

export async function getPublicCatalogData(branchId?: string) {
  return getPublicCatalogDataImpl(branchId);
}
