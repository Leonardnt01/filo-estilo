import { NextResponse } from "next/server";

import { getAuthContext, getManageableBranchIds, isGlobalAdmin } from "@/lib/auth/session";

export async function GET() {
  const { user, role, memberships } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const canAdmin = isGlobalAdmin(role) || (getManageableBranchIds(role, memberships)?.length ?? 0) > 0;

  if (!canAdmin) {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, role, memberships, user_id: user.id });
}
