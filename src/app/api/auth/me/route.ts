import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";

export async function GET() {
  const { user, role, memberships, is_staff } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      role,
      is_staff,
      memberships,
    },
  });
}
