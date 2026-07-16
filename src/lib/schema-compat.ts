type LegacyProfileRow = {
  id?: string;
  nombre?: string | null;
  apellido?: string | null;
  correo?: string | null;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ModernProfileRow = {
  id?: string;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function buildFullName(
  profile: LegacyProfileRow | ModernProfileRow | null | undefined,
  fallback = "Usuario sin nombre",
) {
  if (!profile) return fallback;

  if ("full_name" in profile && profile.full_name?.trim()) {
    return profile.full_name.trim();
  }

  const nombre = "nombre" in profile ? profile.nombre?.trim() : "";
  const apellido = "apellido" in profile ? profile.apellido?.trim() : "";
  const fullName = [nombre, apellido].filter(Boolean).join(" ").trim();

  return fullName || fallback;
}

export function splitFullName(fullName: string) {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return { nombre: "", apellido: "" };
  }

  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return { nombre: parts[0], apellido: "" };
  }

  return {
    nombre: parts.slice(0, -1).join(" "),
    apellido: parts.at(-1) ?? "",
  };
}

export type NormalizedProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "client";
  created_at: string | null;
  updated_at: string | null;
};

export function normalizeProfileForClient(
  profile: LegacyProfileRow | ModernProfileRow | null | undefined,
  user: { id: string; email?: string | null },
): NormalizedProfile {
  let role: "admin" | "client" = "client";
  if (profile?.role === "admin") {
    role = "admin";
  }
  const email =
    profile && "correo" in profile && typeof profile.correo === "string"
      ? profile.correo
      : user.email || "";
  const phone =
    profile && "phone" in profile && typeof profile.phone === "string"
      ? profile.phone
      : null;

  return {
    id: user.id,
    email,
    full_name: buildFullName(profile),
    phone,
    role,
    created_at: profile?.created_at ?? null,
    updated_at: profile?.updated_at ?? null,
  };
}

export type NormalizedAppointment = {
  id: string;
  client_id: string | null;
  branch_id: string | null;
  barber_id: string | null;
  service_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  attendance_status: string;
  attendance_confirmed_at: string | null;
  last_reminder_at: string | null;
  reminder_count: number;
  release_reason: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  barber: unknown;
  service: unknown;
  branch: unknown;
  people: number | null;
  payment_method: string | null;
  payment_status: string | null;
  total_price: number | null;
};

export function normalizeAppointmentForClient(
  appointment: Record<string, unknown>,
): NormalizedAppointment {
  const startTime =
    (typeof appointment.start_time === "string" && appointment.start_time) ||
    (typeof appointment.appointment_time === "string" && appointment.appointment_time) ||
    null;

  return {
    id: typeof appointment.id === "string" ? appointment.id : String(appointment.id ?? ""),
    client_id: typeof appointment.client_id === "string"
      ? appointment.client_id
      : typeof appointment.profile_id === "string"
      ? appointment.profile_id
      : null,
    branch_id: typeof appointment.branch_id === "string" ? appointment.branch_id : null,
    barber_id: typeof appointment.barber_id === "string" ? appointment.barber_id : null,
    service_id: typeof appointment.service_id === "string" ? appointment.service_id : null,
    customer_name: typeof appointment.customer_name === "string" ? appointment.customer_name : null,
    customer_phone: typeof appointment.customer_phone === "string" ? appointment.customer_phone : null,
    customer_email: typeof appointment.customer_email === "string"
      ? appointment.customer_email
      : null,
    appointment_date:
      typeof appointment.appointment_date === "string" ? appointment.appointment_date : "",
    start_time: startTime ? startTime.slice(0, 5) : "",
    end_time: typeof appointment.end_time === "string" ? appointment.end_time : null,
    status: typeof appointment.status === "string" ? appointment.status : "pending",
    attendance_status:
      typeof appointment.attendance_status === "string" ? appointment.attendance_status : "pending",
    attendance_confirmed_at:
      typeof appointment.attendance_confirmed_at === "string" ? appointment.attendance_confirmed_at : null,
    last_reminder_at:
      typeof appointment.last_reminder_at === "string" ? appointment.last_reminder_at : null,
    reminder_count:
      typeof appointment.reminder_count === "number" ? appointment.reminder_count : 0,
    release_reason:
      typeof appointment.release_reason === "string" ? appointment.release_reason : null,
    notes: typeof appointment.notes === "string" ? appointment.notes : null,
    created_at: typeof appointment.created_at === "string" ? appointment.created_at : null,
    updated_at: typeof appointment.updated_at === "string" ? appointment.updated_at : null,
    barber: appointment.barber ?? null,
    service: appointment.service ?? null,
    branch: appointment.branch ?? null,
    people: typeof appointment.people === "number" ? appointment.people : null,
    payment_method: typeof appointment.payment_method === "string" ? appointment.payment_method : null,
    payment_status: typeof appointment.payment_status === "string" ? appointment.payment_status : null,
    total_price: typeof appointment.total_price === "number" ? appointment.total_price : null,
  };
}
