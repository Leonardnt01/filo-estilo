import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { user, role, memberships } = adminCheck;
  const supabase = await createClient();

  // Legacy super-admin profile can see all active branches.
  if (role === "admin") {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, slug, address, phone, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, items: data ?? [] });
  }

  const branchIds = [...new Set(memberships.map((m) => m.branch_id))];
  if (branchIds.length === 0) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const { data, error } = await supabase
    .from("branches")
    .select("id, name, slug, address, phone, is_active")
    .in("id", branchIds)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    items: data ?? [],
    user_id: user.id,
  });
}

