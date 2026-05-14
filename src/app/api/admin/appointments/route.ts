import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
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

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);

  const statusParam = searchParams.get("status");
  const barberId = searchParams.get("barber_id");
  const serviceId = searchParams.get("service_id");
  const branchId = searchParams.get("branch_id");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  if (statusParam) {
    const parsedStatus = appointmentStatus.safeParse(statusParam);
    if (!parsedStatus.success) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }
  }

  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select(
      "id, client_id, barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, created_at, updated_at",
    )
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(limit);

  if (statusParam) query = query.eq("status", statusParam);
  if (barberId) query = query.eq("barber_id", barberId);
  if (serviceId) query = query.eq("service_id", serviceId);
  if (branchId) query = query.eq("branch_id", branchId);
  if (dateFrom) query = query.gte("appointment_date", dateFrom);
  if (dateTo) query = query.lte("appointment_date", dateTo);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: data.length, items: data });
}
