import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";

export async function GET() {
  const { user, role } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, role, user_id: user.id });
}
