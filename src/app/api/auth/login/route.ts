import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { env } from "@/lib/env";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const bodyResult = loginSchema.safeParse(await request.json().catch(() => null));

  if (!bodyResult.success) {
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
    return NextResponse.json(
      { error: `Could not load user profile: ${profileError.message}` },
      { status: 500 },
    );
  }

  const role = profile?.role === "admin" || profile?.role === "client" ? profile.role : null;

  return NextResponse.json({
    ok: true,
    user: {
      id: userId,
      email: data.user.email,
      role,
      full_name: profile?.full_name ?? null,
    },
  });
}
