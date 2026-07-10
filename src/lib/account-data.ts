import { getAuthContext } from "@/lib/auth/session";
import { getPublicHomeData } from "@/lib/public-home";
import { getPublicCatalogData } from "@/lib/public-catalog";
import {
  normalizeAppointmentForClient,
  normalizeProfileForClient,
} from "@/lib/schema-compat";
import { normalizeWaitlistEntryForClient } from "@/lib/waitlist";
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
      .select("id, full_name, phone, role, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("status, appointment_date")
      .eq("client_id", user.id),
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
  const selectVariants: string[] = [
    "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at",
    "id, profile_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at, people, payment_method, payment_status, total_price",
    "id, client_id, branch_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
    "id, profile_id, branch_id, barber_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status, notes, created_at, updated_at, people, payment_method, payment_status, total_price",
  ];

  let data: Record<string, unknown>[] | null = null;
  let error: { message: string } | null = null;

  for (const select of selectVariants) {
    let query = supabase
      .from("appointments")
      .select(select)
      .order("appointment_date", { ascending: false })
      .limit(20);

    if (select.includes("client_id")) {
      query = query.eq("client_id", user.id).order("start_time", { ascending: false });
    } else {
      query = query.eq("profile_id", user.id).order("appointment_time", { ascending: false });
    }

    const res = await query;
    if (!res.error) {
      data = (res.data ?? []) as unknown as Record<string, unknown>[];
      error = null;
      break;
    }
    error = { message: res.error.message };
  }

  let waitlistEntries: ReturnType<typeof normalizeWaitlistEntryForClient>[] = [];

  const waitlistSelectVariants: string[] = [
    `
      id, client_id, branch_id, service_id, barber_id, desired_date, desired_start_from, desired_start_to,
      status, source_appointment_id, promoted_appointment_id, offer_expires_at, notes, created_at, updated_at,
      branch:branches(name), barber:barbers(full_name), service:services(name, price)
    `,
    "id, client_id, branch_id, service_id, barber_id, desired_date, desired_start_from, desired_start_to, status, source_appointment_id, promoted_appointment_id, offer_expires_at, notes, created_at, updated_at",
  ];

  for (const select of waitlistSelectVariants) {
    const waitlistRes = await supabase
      .from("waitlist_entries")
      .select(select)
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (!waitlistRes.error) {
      waitlistEntries = (waitlistRes.data ?? []).map((entry) =>
        normalizeWaitlistEntryForClient(entry as unknown as Record<string, unknown>),
      );
      break;
    }
  }

  const catalog = await getPublicCatalogData().catch(() => null);

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
    waitlistEntries,
    footerBranchContact: catalog?.branches?.[0] ?? null,
  };
}
