import { afterEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, getClientIdentifier } from "../../../src/lib/security/rate-limit";

describe("rate-limit", () => {
  it("permite el primer intento y descuenta el restante", () => {
    const result = checkRateLimit(`test:first-attempt:${crypto.randomUUID()}`, {
      maxAttempts: 3,
      windowMs: 60_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.retryAfterSeconds).toBe(60);
  });

  it("bloquea cuando supera el maximo de intentos", () => {
    const key = `test:block:${crypto.randomUUID()}`;

    checkRateLimit(key, { maxAttempts: 2, windowMs: 60_000 });
    checkRateLimit(key, { maxAttempts: 2, windowMs: 60_000 });
    const blocked = checkRateLimit(key, { maxAttempts: 2, windowMs: 60_000 });

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("usa x-forwarded-for como identificador principal del cliente", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-real-ip": "198.51.100.20",
      },
    });

    expect(getClientIdentifier(request)).toBe("203.0.113.10");
  });

  it("reinicia el contador cuando vence la ventana", () => {
    vi.useFakeTimers();
    const key = `test:reset-window:${crypto.randomUUID()}`;

    checkRateLimit(key, { maxAttempts: 1, windowMs: 60_000 });
    const blocked = checkRateLimit(key, { maxAttempts: 1, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    const reopened = checkRateLimit(key, { maxAttempts: 1, windowMs: 60_000 });
    expect(reopened.allowed).toBe(true);
    expect(reopened.remaining).toBe(0);
  });

  it("usa x-real-ip si no existe x-forwarded-for", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: {
        "x-real-ip": "198.51.100.20",
      },
    });

    expect(getClientIdentifier(request)).toBe("198.51.100.20");
  });

  it("devuelve unknown cuando no hay headers de ip", () => {
    const request = new Request("http://localhost:3000/api/auth/login");

    expect(getClientIdentifier(request)).toBe("unknown");
  });
});

afterEach(() => {
  vi.useRealTimers();
});
