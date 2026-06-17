import { getAuthContext } from "@/lib/auth/session";
import { getPublicHomeData } from "@/lib/public-home";
import { getPublicCatalogData } from "@/lib/public-catalog";
import {
  normalizeAppointmentForClient,
  normalizeProfileForClient,
} from "@/lib/schema-compat";
import { createClient } from "@/lib/supabase/server";

export async function getProfilePageData() {
  const { user } = await getAuthContext();

  if (!user) {
    return {
      ok: false,
      error: "No se pudo cargar tu perfil",
      profile: null,
      stats: null,
      promotions: [],
    };
  }

  const supabase = await createClient();
  const [{ data: profile, error: profileError }, { data: appointments, error: appointmentsError }, homeData] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nombre, apellido, correo, role, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("status, appointment_date")
      .eq("profile_id", user.id),
    getPublicHomeData().catch(() => null),
  ]);

  if (profileError) {
    return { ok: false, error: profileError.message, profile: null, stats: null, promotions: [] };
  }

  if (appointmentsError) {
    return { ok: false, error: appointmentsError.message, profile: null, stats: null, promotions: [] };
  }

  const today = new Date().toISOString().slice(0, 10);
  const stats = {
    total: appointments.length,
    completed: appointments.filter((a) => a.status === "completed").length,
    pending: appointments.filter((a) => ["pending", "confirmed", "in_progress"].includes(a.status)).length,
    upcoming: appointments.filter(
      (a) => ["pending", "confirmed", "in_progress"].includes(a.status) && a.appointment_date >= today,
    ).length,
  };

  return {
    ok: true,
    error: null,
    profile: normalizeProfileForClient(profile, user),
    stats,
    promotions: homeData?.promotions ?? [],
    footerSettings: homeData?.site_settings?.public_footer ?? {},
    footerBranchContact: homeData?.branches?.[0] ?? null,
  };
}

export async function getMyAppointmentsPageData() {
  const { user } = await getAuthContext();

  if (!user) {
    return {
      ok: false,
      error: "No se pudo cargar tus citas",
      items: [],
      services: [],
      barbers: [],
      branches: [],
    };
  }

  const supabase = await createClient();
  const [{ data, error }, catalog] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, profile_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status, notes, created_at, updated_at, people, payment_method, payment_status, total_price",
      )
      .eq("profile_id", user.id)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false })
      .limit(20),
    getPublicCatalogData().catch(() => null),
  ]);

  if (error) {
    return {
      ok: false,
      error: error.message,
      items: [],
      services: [],
      barbers: [],
      branches: [],
    };
  }

  return {
    ok: true,
    error: null,
    items: (data ?? []).map((item) => normalizeAppointmentForClient(item)),
    services: catalog?.services ?? [],
    barbers: catalog?.barbers ?? [],
    branches: catalog?.branches ?? [],
    footerBranchContact: catalog?.branches?.[0] ?? null,
  };
}
