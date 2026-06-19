import "server-only";

import { getEnv } from "@/lib/env";

type CulqiErrorPayload = {
  merchant_message?: string;
  user_message?: string;
  decline_code?: string;
  code?: string;
};

export type CulqiChargeResponse = {
  id: string;
  amount?: number;
  currency_code?: string;
  source?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  outcome?: CulqiErrorPayload;
};

function getCulqiSecretKey() {
  const env = getEnv();
  if (!env.CULQI_SECRET_KEY) {
    throw new Error("Missing CULQI_SECRET_KEY");
  }

  return env.CULQI_SECRET_KEY;
}

function extractCulqiMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const errorPayload = payload as CulqiErrorPayload;
  return errorPayload.user_message ?? errorPayload.merchant_message ?? errorPayload.code ?? null;
}

export function toCulqiAmount(amount: number) {
  return Math.round(amount * 100);
}

export async function createCulqiCharge(payload: {
  amount: number;
  email: string;
  source_id: string;
  description: string;
  metadata?: Record<string, string>;
}) {
  const secretKey = getCulqiSecretKey();
  const response = await fetch("https://api.culqi.com/v2/charges", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: payload.amount,
      currency_code: "PEN",
      email: payload.email,
      source_id: payload.source_id,
      description: payload.description,
      capture: true,
      metadata: payload.metadata,
    }),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => null)) as CulqiChargeResponse | CulqiErrorPayload | null;

  if (!response.ok) {
    const message = extractCulqiMessage(json) ?? `Culqi charge failed with status ${response.status}`;
    throw new Error(message);
  }

  return json as CulqiChargeResponse;
}
