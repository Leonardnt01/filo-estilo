import { NextResponse } from "next/server";

import { getAuthContext, getManageableBranchIds, isGlobalAdmin } from "@/lib/auth/session";

export async function requireAdmin() {
  const { user, role, memberships } = await getAuthContext();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const manageableBranchIds = getManageableBranchIds(role, memberships);
  const hasStaffRole = manageableBranchIds === null || manageableBranchIds.length > 0;

  if (!isGlobalAdmin(role) && !hasStaffRole) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden: owner/admin role required" }, { status: 403 }),
    };
  }

  return { ok: true as const, user, role, memberships };
}
