import { NextResponse } from "next/server";

import { logSecurityEvent } from "@/lib/security/audit-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function resolveFullName(metadata: Record<string, unknown> | null | undefined, email: string | null) {
  if (metadata) {
    const fullName = metadata.full_name ?? metadata.name;
    if (typeof fullName === "string" && fullName.trim()) {
      return fullName.trim();
    }
  }
  return email ?? "Cliente";
}

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    logSecurityEvent({
      event: "auth.oauth.exchange_failed",
      level: "warn",
      route: "/auth/callback",
      method: "GET",
      status: 400,
      message: error?.message ?? "No user returned",
    });
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  // Ensure the profile exists with client role (same guarantee as email register).
  const profilePayload = {
    id: data.user.id,
    full_name: resolveFullName(data.user.user_metadata, data.user.email ?? null),
    role: "client",
  };

  const firstTry = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id", ignoreDuplicates: true });

  if (firstTry.error) {
    try {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!existing) {
        await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
      }
    } catch (e) {
      logSecurityEvent({
        event: "auth.oauth.profile_creation_failed",
        level: "error",
        route: "/auth/callback",
        method: "GET",
        userId: data.user.id,
        email: data.user.email ?? undefined,
        status: 500,
        message: e instanceof Error ? e.message : "Could not ensure profile",
      });
    }
  }

  logSecurityEvent({
    event: "auth.oauth.success",
    level: "info",
    route: "/auth/callback",
    method: "GET",
    userId: data.user.id,
    email: data.user.email ?? undefined,
    status: 302,
    metadata: { provider: data.user.app_metadata?.provider ?? "unknown" },
  });

  return NextResponse.redirect(`${origin}${safeNext}`);
}
