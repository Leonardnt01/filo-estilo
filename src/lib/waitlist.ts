import { addMinutes, getAppointmentStartAt, timeToMinutes } from "@/lib/booking";

export const WAITLIST_STATUSES = [
  "active",
  "offered",
  "accepted",
  "rejected",
  "expired",
  "fulfilled",
  "cancelled",
] as const;

export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export type WaitlistEntry = {
  id: string;
  client_id: string;
  branch_id: string;
  service_id: string;
  barber_id: string | null;
  desired_date: string;
  desired_start_from: string | null;
  desired_start_to: string | null;
  status: WaitlistStatus;
  source_appointment_id: string | null;
  promoted_appointment_id: string | null;
  offer_expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  branch?: unknown;
  barber?: unknown;
  service?: unknown;
};

export function normalizeWaitlistEntryForClient(entry: Record<string, unknown>): WaitlistEntry {
  return {
    id: typeof entry.id === "string" ? entry.id : String(entry.id ?? ""),
    client_id: typeof entry.client_id === "string" ? entry.client_id : "",
    branch_id: typeof entry.branch_id === "string" ? entry.branch_id : "",
    service_id: typeof entry.service_id === "string" ? entry.service_id : "",
    barber_id: typeof entry.barber_id === "string" ? entry.barber_id : null,
    desired_date: typeof entry.desired_date === "string" ? entry.desired_date : "",
    desired_start_from:
      typeof entry.desired_start_from === "string" ? entry.desired_start_from.slice(0, 5) : null,
    desired_start_to:
      typeof entry.desired_start_to === "string" ? entry.desired_start_to.slice(0, 5) : null,
    status: WAITLIST_STATUSES.includes(entry.status as WaitlistStatus)
      ? (entry.status as WaitlistStatus)
      : "active",
    source_appointment_id:
      typeof entry.source_appointment_id === "string" ? entry.source_appointment_id : null,
    promoted_appointment_id:
      typeof entry.promoted_appointment_id === "string" ? entry.promoted_appointment_id : null,
    offer_expires_at: typeof entry.offer_expires_at === "string" ? entry.offer_expires_at : null,
    notes: typeof entry.notes === "string" ? entry.notes : null,
    created_at: typeof entry.created_at === "string" ? entry.created_at : new Date().toISOString(),
    updated_at: typeof entry.updated_at === "string" ? entry.updated_at : new Date().toISOString(),
    branch: entry.branch ?? null,
    barber: entry.barber ?? null,
    service: entry.service ?? null,
  };
}

export function canJoinWaitlist(desiredDate: string) {
  const todayIso = new Date().toISOString().slice(0, 10);
  return desiredDate >= todayIso;
}

export function isWaitlistOfferActive(entry: Pick<WaitlistEntry, "status" | "offer_expires_at">) {
  if (entry.status !== "offered") {
    return false;
  }

  if (!entry.offer_expires_at) {
    return true;
  }

  return new Date(entry.offer_expires_at).getTime() > Date.now();
}

export function canRespondToWaitlistOffer(entry: Pick<WaitlistEntry, "status" | "offer_expires_at">) {
  return isWaitlistOfferActive(entry);
}

export function isDesiredWindowCompatible(
  slotStartTime: string,
  slotEndTime: string,
  desiredStartFrom: string | null,
  desiredStartTo: string | null,
) {
  const normalizedStart = slotStartTime.slice(0, 5);
  const normalizedEnd = slotEndTime.slice(0, 5);

  if (desiredStartFrom && timeToMinutes(normalizedStart) < timeToMinutes(desiredStartFrom)) {
    return false;
  }

  if (desiredStartTo && timeToMinutes(normalizedEnd) > timeToMinutes(desiredStartTo)) {
    return false;
  }

  return true;
}

export function getOfferExpiry(hoursFromNow = 2) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

export function buildWaitlistRange(selectedStart: string | null, serviceDurationMinutes: number | null) {
  if (!selectedStart) {
    return {
      desiredStartFrom: "00:00",
      desiredStartTo: "23:59",
    };
  }

  return {
    desiredStartFrom: selectedStart.slice(0, 5),
    desiredStartTo: addMinutes(selectedStart.slice(0, 5), serviceDurationMinutes ?? 30),
  };
}

export function isOfferExpired(offerExpiresAt: string | null) {
  if (!offerExpiresAt) return false;
  return new Date(offerExpiresAt).getTime() <= Date.now();
}

export function isWaitlistEntryUpcoming(entry: Pick<WaitlistEntry, "desired_date" | "desired_start_from">) {
  if (!entry.desired_date) return false;
  const startTime = entry.desired_start_from ?? "00:00";
  return getAppointmentStartAt(entry.desired_date, startTime).getTime() > Date.now();
}
