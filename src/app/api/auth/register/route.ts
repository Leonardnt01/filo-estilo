import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { env } from "@/lib/env";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const bodyResult = registerSchema.safeParse(await request.json().catch(() => null));

  if (!bodyResult.success) {
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
    const isConflict = /already|exists|registered/i.test(error.message);
    return NextResponse.json({ error: error.message }, { status: isConflict ? 409 : 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "User could not be created" }, { status: 500 });
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      full_name: bodyResult.data.full_name,
      role: "client",
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return NextResponse.json(
      { error: `User created but profile could not be created: ${profileError.message}` },
      { status: 500 },
    );
  }

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
