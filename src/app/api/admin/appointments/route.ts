import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageBranch, getManageableBranchIds, isGlobalAdmin } from "@/lib/auth/session";
import { normalizeAppointmentForClient } from "@/lib/schema-compat";
import { createClient } from "@/lib/supabase/server";

const appointmentStatus = z.enum([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;
  const { role, memberships } = adminCheck;

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get("limit") ?? "100");
  const limit = Number.isNaN(rawLimit) ? 100 : Math.min(Math.max(rawLimit, 1), 100);

  const statusParam = searchParams.get("status");
  const barberId = searchParams.get("barber_id");
  const serviceId = searchParams.get("service_id");
  const branchId = searchParams.get("branch_id");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  if (branchId && !canManageBranch(role, memberships, branchId)) {
    return NextResponse.json({ error: "Forbidden for this branch" }, { status: 403 });
  }

  if (statusParam) {
    const parsedStatus = appointmentStatus.safeParse(statusParam);
    if (!parsedStatus.success) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }
  }

  const supabase = await createClient();

  const selectVariants: string[] = [
    `
      id, client_id, barber_id, service_id, branch_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at,
      barber:barbers(full_name, image_url),
      service:services(name, price, image_url),
      branch:branches(name)
    `,
    `
      id, client_id, barber_id, service_id, branch_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at,
      barber:barbers(full_name, image_url),
      service:services(name, price),
      branch:branches(name)
    `,
    `
      id, client_id, barber_id, service_id, branch_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at,
      barber:barbers(full_name),
      service:services(name, price),
      branch:branches(name)
    `,
    `
      id, client_id, barber_id, service_id, branch_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at
    `,
    `
      id, profile_id, barber_id, service_id, branch_id, customer_name, customer_phone, appointment_date, appointment_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at, people, payment_method, payment_status, total_price,
      barber:barbers(full_name, image_url),
      service:services(name, price, image_url),
      branch:branches(name)
    `,
    `
      id, profile_id, barber_id, service_id, branch_id, customer_name, customer_phone, appointment_date, appointment_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at, people, payment_method, payment_status, total_price,
      barber:barbers(full_name, image_url),
      service:services(name, price),
      branch:branches(name)
    `,
    `
      id, profile_id, barber_id, service_id, branch_id, customer_name, appointment_date, appointment_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at, people, payment_method, payment_status, total_price,
      barber:barbers(full_name),
      service:services(name, price),
      branch:branches(name)
    `,
    `
      id, profile_id, barber_id, service_id, branch_id, appointment_date, appointment_time, status, attendance_status, attendance_confirmed_at, last_reminder_at, reminder_count, release_reason, notes, created_at, updated_at, people, payment_method, payment_status, total_price
    `,
    `
      id, client_id, barber_id, service_id, branch_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, created_at, updated_at,
      barber:barbers(full_name),
      service:services(name, price),
      branch:branches(name)
    `,
    `
      id, profile_id, barber_id, service_id, branch_id, customer_name, customer_phone, appointment_date, appointment_time, status, notes, created_at, updated_at, people, payment_method, payment_status, total_price,
      barber:barbers(full_name),
      service:services(name, price),
      branch:branches(name)
    `,
  ];

  let data: unknown[] | null = null;
  let error: { message: string } | null = null;

  for (const select of selectVariants) {
    let query = supabase
      .from("appointments")
      .select(select)
      .order("created_at", { ascending: false })
      .order("appointment_date", { ascending: false })
      .limit(limit);

    const usesModernTimeField = select.includes("start_time");
    query = query.order(usesModernTimeField ? "start_time" : "appointment_time", { ascending: false });

    if (statusParam) query = query.eq("status", statusParam);
    if (barberId) query = query.eq("barber_id", barberId);
    if (serviceId) query = query.eq("service_id", serviceId);
    if (branchId) {
      query = query.eq("branch_id", branchId);
    } else if (!isGlobalAdmin(role)) {
      const allowedBranchIds = getManageableBranchIds(role, memberships);
      if (!allowedBranchIds || allowedBranchIds.length === 0) {
        return NextResponse.json({ ok: true, count: 0, items: [] });
      }
      query = query.in("branch_id", allowedBranchIds);
    }
    if (dateFrom) query = query.gte("appointment_date", dateFrom);
    if (dateTo) query = query.lte("appointment_date", dateTo);

    const res = await query;
    if (!res.error) {
      data = res.data;
      error = null;
      break;
    }
    error = { message: res.error.message };
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((item) =>
    normalizeAppointmentForClient(item as unknown as Record<string, unknown>),
  );

  return NextResponse.json({ ok: true, count: items.length, items });
}
