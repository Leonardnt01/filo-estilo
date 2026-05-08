import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

const createServiceSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  price: z.number().min(0),
  duration_minutes: z.number().int().positive(),
  is_active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get("only_active") === "true";

  const supabase = await createClient();
  let query = supabase
    .from("services")
    .select("id, name, description, price, duration_minutes, is_active, created_at, updated_at")
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
  const parsed = createServiceSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      duration_minutes: parsed.data.duration_minutes,
      is_active: parsed.data.is_active ?? true,
    })
    .select("id, name, description, price, duration_minutes, is_active, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
