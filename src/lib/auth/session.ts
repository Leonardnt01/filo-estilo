import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type ProfileRole = "admin" | "client";

export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null as User | null, role: null as ProfileRole | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    profile?.role === "admin" || profile?.role === "client"
      ? (profile.role as ProfileRole)
      : null;

  return { user, role };
}
