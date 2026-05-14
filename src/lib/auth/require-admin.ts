import { NextResponse } from "next/server";

import type { BranchRole } from "@/lib/auth/session";
import { getAuthContext } from "@/lib/auth/session";

export async function requireAdmin() {
  const { user, role, memberships } = await getAuthContext();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const allowedRoles: BranchRole[] = ["owner", "admin"];
  const hasStaffRole = memberships.some((m) => allowedRoles.includes(m.role));

  if (role !== "admin" && !hasStaffRole) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden: owner/admin role required" }, { status: 403 }),
    };
  }

  return { ok: true as const, user, role, memberships };
}
