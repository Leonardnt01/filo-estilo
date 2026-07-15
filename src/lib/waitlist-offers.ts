import "server-only";

import { getOfferExpiry, isDesiredWindowCompatible } from "@/lib/waitlist";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReleasedSlot = {
  appointmentId: string;
  branchId: string;
  barberId: string | null;
  serviceId: string | null;
  appointmentDate: string;
  startTime: string | null;
  endTime: string | null;
};

export type WaitlistOfferResult =
  | { offered: true; entryId: string; offerExpiresAt: string }
  | { offered: false; reason: "admin_client_unavailable" | "no_matching_entry" | "query_error" | "update_error" };

type CandidateEntry = {
  id: string;
  barber_id: string | null;
  desired_start_from: string | null;
  desired_start_to: string | null;
};

function isBarberCompatible(entryBarberId: string | null, releasedBarberId: string | null) {
  if (!entryBarberId) return true;
  if (!releasedBarberId) return true;
  return entryBarberId === releasedBarberId;
}

function isTimeCompatible(entry: CandidateEntry, released: ReleasedSlot) {
  if (!released.startTime) return true;
  const start = released.startTime.slice(0, 5);
  const end = (released.endTime ?? released.startTime).slice(0, 5);
  return isDesiredWindowCompatible(start, end, entry.desired_start_from, entry.desired_start_to);
}

/**
 * When an appointment slot is released (client declined/cancelled, admin cancelled
 * or marked no_show), offer the freed slot to the oldest compatible active
 * waitlist entry. Runs with the service-role client because the actor releasing
 * the slot is not the owner of the waitlist entry being promoted (RLS).
 * Best-effort: callers must not fail the main operation if this returns offered=false.
 */
export async function offerReleasedSlotToWaitlist(released: ReleasedSlot): Promise<WaitlistOfferResult> {
  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return { offered: false, reason: "admin_client_unavailable" };
  }

  let query = supabase
    .from("waitlist_entries")
    .select("id, barber_id, desired_start_from, desired_start_to")
    .eq("branch_id", released.branchId)
    .eq("desired_date", released.appointmentDate)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (released.serviceId) {
    query = query.eq("service_id", released.serviceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[WAITLIST] failed to load candidates for released slot", {
      appointmentId: released.appointmentId,
      error: error.message,
    });
    return { offered: false, reason: "query_error" };
  }

  const candidate = ((data ?? []) as CandidateEntry[]).find(
    (entry) => isBarberCompatible(entry.barber_id, released.barberId) && isTimeCompatible(entry, released),
  );

  if (!candidate) {
    return { offered: false, reason: "no_matching_entry" };
  }

  const offerExpiresAt = getOfferExpiry();
  const { error: updateError } = await supabase
    .from("waitlist_entries")
    .update({
      status: "offered",
      offer_expires_at: offerExpiresAt,
      source_appointment_id: released.appointmentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidate.id)
    .eq("status", "active");

  if (updateError) {
    console.error("[WAITLIST] failed to promote entry to offered", {
      entryId: candidate.id,
      error: updateError.message,
    });
    return { offered: false, reason: "update_error" };
  }

  console.log("[WAITLIST] slot released and offered", {
    appointmentId: released.appointmentId,
    entryId: candidate.id,
    offerExpiresAt,
  });

  return { offered: true, entryId: candidate.id, offerExpiresAt };
}

export function releasedSlotFromAppointment(appointment: Record<string, unknown>): ReleasedSlot | null {
  const branchId = typeof appointment.branch_id === "string" ? appointment.branch_id : null;
  const appointmentDate =
    typeof appointment.appointment_date === "string" ? appointment.appointment_date : null;

  if (!branchId || !appointmentDate) {
    return null;
  }

  const startTime =
    typeof appointment.start_time === "string"
      ? appointment.start_time
      : typeof appointment.appointment_time === "string"
        ? appointment.appointment_time
        : null;

  return {
    appointmentId: String(appointment.id ?? ""),
    branchId,
    barberId: typeof appointment.barber_id === "string" ? appointment.barber_id : null,
    serviceId: typeof appointment.service_id === "string" ? appointment.service_id : null,
    appointmentDate,
    startTime,
    endTime: typeof appointment.end_time === "string" ? appointment.end_time : null,
  };
}
