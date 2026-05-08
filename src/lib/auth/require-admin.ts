import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";

export async function requireAdmin() {
  const { user, role } = await getAuthContext();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  if (role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 }),
    };
  }

  return { ok: true as const, user, role };
}
