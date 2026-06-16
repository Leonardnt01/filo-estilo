import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CULQI_PUBLIC_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CULQI_RSA_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_CULQI_RSA_PUBLIC_KEY: z.string().min(1).optional(),
  CULQI_SECRET_KEY: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_CULQI_PUBLIC_KEY: process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY,
    NEXT_PUBLIC_CULQI_RSA_ID: process.env.NEXT_PUBLIC_CULQI_RSA_ID,
    NEXT_PUBLIC_CULQI_RSA_PUBLIC_KEY: process.env.NEXT_PUBLIC_CULQI_RSA_PUBLIC_KEY,
    CULQI_SECRET_KEY: process.env.CULQI_SECRET_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      "Supabase env vars are missing or invalid. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
