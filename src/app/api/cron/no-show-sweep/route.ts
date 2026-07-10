import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { appendAuditNote } from "@/lib/booking";

/**
 * GET /api/cron/no-show-sweep
 *
 * Automated sweep that runs every 15 minutes (via Vercel Cron or external scheduler).
 * Performs three cleanup tasks:
 *
 * 1. Auto-mark as no_show: appointments that are past their start time,
 *    still in a "pending" or "confirmed" status, and whose attendance was
 *    never confirmed by the client.
 *
 * 2. Expire attendance: appointments whose start time has passed with
 *    attendance_status still "pending" → mark as "expired".
 *
 * 3. Expire waitlist offers: waitlist entries with status "offered" whose
 *    offer_expires_at has passed → mark as "expired".
 *
 * Protected by the CRON_SECRET environment variable. Vercel automatically
 * sends this header for cron invocations; external callers must include
 * `Authorization: Bearer <CRON_SECRET>`.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const APPOINTMENT_SWEEP_SELECT_VARIANTS = [
  {
    select: "id, status, appointment_date, start_time, attendance_status, notes",
    timeColumn: "start_time",
  },
  {
    select: "id, status, appointment_date, appointment_time, attendance_status, notes",
    timeColumn: "appointment_time",
  },
] as const;

type AppointmentSweepRow = {
  id: string;
  status?: string | null;
  appointment_date?: string | null;
  start_time?: string | null;
  appointment_time?: string | null;
  attendance_status?: string | null;
  notes?: string | null;
};

function dedupeAppointments(rows: AppointmentSweepRow[]) {
  const uniqueIds = new Set<string>();
  return rows.filter((item) => {
    if (!item.id || uniqueIds.has(item.id)) return false;
    uniqueIds.add(item.id);
    return true;
  });
}

async function queryAppointmentSweepRows(params: {
  mode: "pendingNoShow" | "pendingAttendanceExpire";
  todayDate: string;
  currentTime: string;
}) {
  const supabase = createAdminClient();
  let lastError: string | null = null;

  for (const variant of APPOINTMENT_SWEEP_SELECT_VARIANTS) {
    let pastDateQuery = supabase
      .from("appointments")
      .select(variant.select)
      .lt("appointment_date", params.todayDate)
      .limit(200);

    let pastTimeQuery = supabase
      .from("appointments")
      .select(variant.select)
      .eq("appointment_date", params.todayDate)
      .lte(variant.timeColumn, params.currentTime)
      .limit(200);

    if (params.mode === "pendingNoShow") {
      pastDateQuery = pastDateQuery
        .in("status", ["pending", "confirmed"])
        .neq("attendance_status", "confirmed");
      pastTimeQuery = pastTimeQuery
        .in("status", ["pending", "confirmed"])
        .neq("attendance_status", "confirmed");
    } else {
      pastDateQuery = pastDateQuery.eq("attendance_status", "pending");
      pastTimeQuery = pastTimeQuery.eq("attendance_status", "pending");
    }

    const [pastDateResult, pastTimeResult] = await Promise.all([pastDateQuery, pastTimeQuery]);

    if (!pastDateResult.error && !pastTimeResult.error) {
      return {
        ok: true as const,
        rows: dedupeAppointments([
          ...((pastDateResult.data as AppointmentSweepRow[] | null) ?? []),
          ...((pastTimeResult.data as AppointmentSweepRow[] | null) ?? []),
        ]),
      };
    }

    lastError = [pastDateResult.error?.message, pastTimeResult.error?.message].filter(Boolean).join(" | ");
  }

  return {
    ok: false as const,
    error: lastError ?? "Could not query appointments for no-show sweep",
  };
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  // In development without a secret, allow all requests
  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }

  // Vercel Cron sends the secret via the Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const todayDate = nowIso.slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);
  const auditTimestamp = nowIso;

  const summary = {
    noShowMarked: 0,
    attendanceExpired: 0,
    waitlistOffersExpired: 0,
    errors: [] as string[],
  };
  const autoNoShowIds = new Set<string>();

  // ──────────────────────────────────────────────────────────────
  // 1) AUTO-MARK NO_SHOW
  //    Citas pasadas con status pending/confirmed y attendance NO confirmada
  // ──────────────────────────────────────────────────────────────
  try {
    const noShowCandidates = await queryAppointmentSweepRows({
      mode: "pendingNoShow",
      todayDate,
      currentTime,
    });

    if (!noShowCandidates.ok) {
      summary.errors.push(`noShow query: ${noShowCandidates.error}`);
    }

    for (const item of noShowCandidates.ok ? noShowCandidates.rows : []) {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          status: "no_show",
          attendance_status: "expired",
          release_reason: "no_show",
          notes: appendAuditNote(
            typeof item.notes === "string" ? item.notes : null,
            `[AUTO_NO_SHOW ${auditTimestamp}] attendance_status was "${item.attendance_status ?? "pending"}"`,
          ),
        })
        .eq("id", item.id);

      if (updateError) {
        summary.errors.push(`no_show update ${item.id}: ${updateError.message}`);
      } else {
        summary.noShowMarked += 1;
        autoNoShowIds.add(item.id);
      }
    }
  } catch (err) {
    summary.errors.push(`noShow phase: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ──────────────────────────────────────────────────────────────
  // 2) EXPIRE ATTENDANCE STATUS
  //    Citas pasadas con attendance_status "pending" → "expired"
  //    (includes completed/in_progress/cancelled that still had pending attendance)
  // ──────────────────────────────────────────────────────────────
  try {
    const expireCandidates = await queryAppointmentSweepRows({
      mode: "pendingAttendanceExpire",
      todayDate,
      currentTime,
    });

    if (!expireCandidates.ok) {
      summary.errors.push(`attendanceExpire query: ${expireCandidates.error}`);
    }

    for (const item of expireCandidates.ok ? expireCandidates.rows : []) {
      if (autoNoShowIds.has(item.id)) {
        continue;
      }

      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          attendance_status: "expired",
          notes: appendAuditNote(
            typeof item.notes === "string" ? item.notes : null,
            `[AUTO_ATTENDANCE_EXPIRED ${auditTimestamp}]`,
          ),
        })
        .eq("id", item.id)
        .eq("attendance_status", "pending"); // Safety guard

      if (updateError) {
        summary.errors.push(`attendance expire ${item.id}: ${updateError.message}`);
      } else {
        summary.attendanceExpired += 1;
      }
    }
  } catch (err) {
    summary.errors.push(`attendanceExpire phase: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ──────────────────────────────────────────────────────────────
  // 3) EXPIRE WAITLIST OFFERS
  //    Entries with status "offered" and offer_expires_at <= now
  // ──────────────────────────────────────────────────────────────
  try {
    const { data: expiredOffers, error: offersError } = await supabase
      .from("waitlist_entries")
      .select("id, status, offer_expires_at, notes")
      .eq("status", "offered")
      .lte("offer_expires_at", nowIso)
      .limit(200);

    if (offersError) {
      summary.errors.push(`waitlist offers query: ${offersError.message}`);
    }

    for (const entry of expiredOffers ?? []) {
      const { error: updateError } = await supabase
        .from("waitlist_entries")
        .update({
          status: "expired",
          notes: appendAuditNote(
            typeof entry.notes === "string" ? entry.notes : null,
            `[AUTO_OFFER_EXPIRED ${auditTimestamp}] was offered until ${entry.offer_expires_at}`,
          ),
        })
        .eq("id", entry.id)
        .eq("status", "offered"); // Safety guard

      if (updateError) {
        summary.errors.push(`waitlist expire ${entry.id}: ${updateError.message}`);
      } else {
        summary.waitlistOffersExpired += 1;
      }
    }
  } catch (err) {
    summary.errors.push(`waitlistExpire phase: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ──────────────────────────────────────────────────────────────
  // Response
  // ──────────────────────────────────────────────────────────────
  const totalProcessed = summary.noShowMarked + summary.attendanceExpired + summary.waitlistOffersExpired;

  console.log("[CRON] no-show-sweep completed", {
    ...summary,
    totalProcessed,
    ranAt: auditTimestamp,
  });

  return NextResponse.json({
    ok: true,
    summary: {
      ...summary,
      totalProcessed,
    },
    ranAt: auditTimestamp,
  });
}
