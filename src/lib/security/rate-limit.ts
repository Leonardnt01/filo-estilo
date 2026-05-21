type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function parseIpFromForwarded(value: string | null) {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

export function getClientIdentifier(request: Request) {
  const forwardedFor = parseIpFromForwarded(request.headers.get("x-forwarded-for"));
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor || realIp || "unknown";
  return ip;
}

export function checkRateLimit(
  key: string,
  options: {
    maxAttempts: number;
    windowMs: number;
  },
) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(options.maxAttempts - 1, 0),
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  current.count += 1;
  buckets.set(key, current);

  if (current.count > options.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(options.maxAttempts - current.count, 0),
    retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
  };
}

