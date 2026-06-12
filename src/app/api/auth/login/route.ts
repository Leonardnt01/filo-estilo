import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { env } from "@/lib/env";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

//sdadadsada

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`auth:login:${clientId}`, {
    maxAttempts: 5,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    logSecurityEvent({
      event: "auth.rate_limit_blocked",
      level: "warn",
      route: "/api/auth/login",
      method: "POST",
      ip: clientId,
      status: 429,
      metadata: { retry_after_seconds: rateLimit.retryAfterSeconds },
    });

    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const bodyResult = loginSchema.safeParse(await request.json().catch(() => null));

  if (!bodyResult.success) {
    logSecurityEvent({
      event: "auth.login.invalid_payload",
      level: "warn",
      route: "/api/auth/login",
      method: "POST",
      ip: clientId,
      status: 400,
    });

    return NextResponse.json(
      { error: "Invalid payload. Required: email, password" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: bodyResult.data.email,
    password: bodyResult.data.password,
  });

  if (error || !data.user) {
    logSecurityEvent({
      event: "auth.login.failed",
      level: "warn",
      route: "/api/auth/login",
      method: "POST",
      ip: clientId,
      email: bodyResult.data.email,
      status: 401,
      message: error?.message ?? "Invalid credentials",
    });

    return NextResponse.json(
      { error: error?.message ?? "Invalid credentials" },
      { status: 401 },
    );
  }

  const userId = data.user.id;

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    logSecurityEvent({
      event: "auth.login.profile_lookup_failed",
      level: "error",
      route: "/api/auth/login",
      method: "POST",
      ip: clientId,
      userId,
      status: 500,
      message: profileError.message,
    });

    return NextResponse.json(
      { error: `Could not load user profile: ${profileError.message}` },
      { status: 500 },
    );
  }

  const role = profile?.role === "admin" || profile?.role === "client" ? profile.role : null;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("branch_id, role, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  const safeMemberships = (memberships ?? []).map((m) => ({
    branch_id: m.branch_id,
    role: m.role,
  }));
  const isStaff = safeMemberships.length > 0 || role === "admin";

  logSecurityEvent({
    event: "auth.login.success",
    level: "info",
    route: "/api/auth/login",
    method: "POST",
    ip: clientId,
    userId,
    email: data.user.email ?? undefined,
    status: 200,
    metadata: {
      role,
      is_staff: isStaff,
      memberships_count: safeMemberships.length,
    },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: userId,
      email: data.user.email,
      role,
      full_name: profile?.full_name ?? null,
      is_staff: isStaff,
      memberships: safeMemberships,
    },
  });
}
