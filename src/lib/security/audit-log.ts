type SecurityLevel = "info" | "warn" | "error";

type SecurityEvent = {
  event: string;
  level?: SecurityLevel;
  route?: string;
  method?: string;
  ip?: string;
  userId?: string;
  email?: string;
  status?: number;
  message?: string;
  metadata?: Record<string, unknown>;
};
export function logSecurityEvent(payload: SecurityEvent) {
  const entry = {
    ts: new Date().toISOString(),
    level: payload.level ?? "info",
    event: payload.event,
    route: payload.route ?? null,
    method: payload.method ?? null,
    ip: payload.ip ?? null,
    user_id: payload.userId ?? null,
    email: payload.email ?? null,
    status: payload.status ?? null,
    message: payload.message ?? null,
    metadata: payload.metadata ?? {},
  };

  // JSON log keeps evidence machine-readable for future SIEM integration.
  console.log(`[SECURITY] ${JSON.stringify(entry)}`);
}

