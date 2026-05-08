import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

const imageUrlSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/"), {
    message: "image_url must be a valid URL or data image",
  });

const createBarberSchema = z.object({
  full_name: z.string().trim().min(1),
  specialty: z.string().trim().optional().nullable(),
  image_url: imageUrlSchema.optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get("only_active") === "true";

  const supabase = await createClient();
  let query = supabase
    .from("barbers")
    .select("id, full_name, specialty, image_url, is_active, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: data.length, items: data });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const payload = await request.json().catch(() => null);
  const parsed = createBarberSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbers")
    .insert({
      full_name: parsed.data.full_name,
      specialty: parsed.data.specialty ?? null,
      image_url: parsed.data.image_url ?? null,
      is_active: parsed.data.is_active ?? true,
    })
    .select("id, full_name, specialty, image_url, is_active, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
