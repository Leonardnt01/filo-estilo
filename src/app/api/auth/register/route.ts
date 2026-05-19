import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { env } from "@/lib/env";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`auth:register:${clientId}`, {
    maxAttempts: 3,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    logSecurityEvent({
      event: "auth.rate_limit_blocked",
      level: "warn",
      route: "/api/auth/register",
      method: "POST",
      ip: clientId,
      status: 429,
      metadata: { retry_after_seconds: rateLimit.retryAfterSeconds },
    });

    return NextResponse.json(
      { error: "Too many register attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const bodyResult = registerSchema.safeParse(await request.json().catch(() => null));

  if (!bodyResult.success) {
    logSecurityEvent({
      event: "auth.register.invalid_payload",
      level: "warn",
      route: "/api/auth/register",
      method: "POST",
      ip: clientId,
      status: 400,
    });

    return NextResponse.json(
      { error: "Invalid payload. Required: email, password, full_name" },
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

  const { data, error } = await supabase.auth.signUp({
    email: bodyResult.data.email,
    password: bodyResult.data.password,
    options: {
      data: {
        full_name: bodyResult.data.full_name,
      },
    },
  });

  if (error) {
    logSecurityEvent({
      event: "auth.register.failed",
      level: "warn",
      route: "/api/auth/register",
      method: "POST",
      ip: clientId,
      email: bodyResult.data.email,
      status: /already|exists|registered/i.test(error.message) ? 409 : 400,
      message: error.message,
    });

    const isConflict = /already|exists|registered/i.test(error.message);
    return NextResponse.json({ error: error.message }, { status: isConflict ? 409 : 400 });
  }

  if (!data.user) {
    logSecurityEvent({
      event: "auth.register.user_creation_missing",
      level: "error",
      route: "/api/auth/register",
      method: "POST",
      ip: clientId,
      email: bodyResult.data.email,
      status: 500,
      message: "User could not be created",
    });

    return NextResponse.json({ error: "User could not be created" }, { status: 500 });
  }

  // Supabase can return success with an existing user when confirmation flow is enabled.
  if ((data.user.identities?.length ?? 0) === 0) {
    logSecurityEvent({
      event: "auth.register.duplicate_identity",
      level: "warn",
      route: "/api/auth/register",
      method: "POST",
      ip: clientId,
      email: bodyResult.data.email,
      status: 409,
      message: "Email already exists",
    });

    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const profilePayload = {
    id: data.user.id,
    full_name: bodyResult.data.full_name,
    role: "client",
  };

  const firstTry = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
  let profileError: { message: string } | null = firstTry.error ? { message: firstTry.error.message } : null;

  if (profileError) {
    try {
      const admin = createAdminClient();
      const fallbackTry = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
      profileError = fallbackTry.error ? { message: fallbackTry.error.message } : null;
    } catch (e) {
      profileError = { message: e instanceof Error ? e.message : "Could not create profile" };
    }
  }

  if (profileError) {
    logSecurityEvent({
      event: "auth.register.profile_creation_failed",
      level: "error",
      route: "/api/auth/register",
      method: "POST",
      ip: clientId,
      userId: data.user.id,
      email: data.user.email ?? bodyResult.data.email,
      status: 500,
      message: profileError.message,
    });

    return NextResponse.json(
      { error: `User created but profile could not be created: ${profileError.message}` },
      { status: 500 },
    );
  }

  logSecurityEvent({
    event: "auth.register.success",
    level: "info",
    route: "/api/auth/register",
    method: "POST",
    ip: clientId,
    userId: data.user.id,
    email: data.user.email ?? bodyResult.data.email,
    status: 201,
  });

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: bodyResult.data.full_name,
      },
    },
    { status: 201 },
  );
}
