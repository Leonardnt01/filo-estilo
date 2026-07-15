import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildWaitlistRange,
  canJoinWaitlist,
  canRespondToWaitlistOffer,
  getOfferExpiry,
  isDesiredWindowCompatible,
  isOfferExpired,
  isWaitlistOfferActive,
} from "../../../src/lib/waitlist";

describe("reglas de lista de espera (waitlist)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-12T10:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("canJoinWaitlist", () => {
    it("permite unirse para hoy o fechas futuras", () => {
      expect(canJoinWaitlist("2026-06-12")).toBe(true);
      expect(canJoinWaitlist("2026-06-20")).toBe(true);
    });

    it("rechaza fechas pasadas", () => {
      expect(canJoinWaitlist("2026-06-11")).toBe(false);
    });
  });

  describe("isWaitlistOfferActive", () => {
    it("una oferta vigente está activa", () => {
      expect(
        isWaitlistOfferActive({
          status: "offered",
          offer_expires_at: "2026-06-12T20:00:00.000Z",
        }),
      ).toBe(true);
    });

    it("una oferta vencida no está activa", () => {
      expect(
        isWaitlistOfferActive({
          status: "offered",
          offer_expires_at: "2026-06-12T09:00:00.000Z",
        }),
      ).toBe(false);
    });

    it("una entrada sin oferta no está activa", () => {
      expect(
        isWaitlistOfferActive({ status: "active", offer_expires_at: null }),
      ).toBe(false);
    });

    it("una oferta sin fecha de expiración se considera activa", () => {
      expect(
        isWaitlistOfferActive({ status: "offered", offer_expires_at: null }),
      ).toBe(true);
    });
  });

  describe("canRespondToWaitlistOffer", () => {
    it("solo se puede responder a una oferta activa", () => {
      expect(
        canRespondToWaitlistOffer({
          status: "offered",
          offer_expires_at: "2026-06-12T20:00:00.000Z",
        }),
      ).toBe(true);
      expect(
        canRespondToWaitlistOffer({ status: "cancelled", offer_expires_at: null }),
      ).toBe(false);
    });
  });

  describe("isDesiredWindowCompatible", () => {
    it("acepta un slot dentro de la ventana deseada", () => {
      expect(isDesiredWindowCompatible("10:00", "10:30", "09:00", "12:00")).toBe(true);
    });

    it("rechaza un slot que empieza antes de la ventana", () => {
      expect(isDesiredWindowCompatible("08:30", "09:00", "09:00", "12:00")).toBe(false);
    });

    it("rechaza un slot que termina después de la ventana", () => {
      expect(isDesiredWindowCompatible("11:45", "12:15", "09:00", "12:00")).toBe(false);
    });

    it("acepta cualquier slot cuando no hay ventana definida", () => {
      expect(isDesiredWindowCompatible("07:00", "07:30", null, null)).toBe(true);
    });
  });

  describe("getOfferExpiry / isOfferExpired", () => {
    it("genera una expiración futura por defecto", () => {
      const expiry = getOfferExpiry();
      expect(new Date(expiry).getTime()).toBeGreaterThan(Date.now());
      expect(isOfferExpired(expiry)).toBe(false);
    });

    it("detecta una oferta expirada", () => {
      expect(isOfferExpired("2026-06-12T09:59:00.000Z")).toBe(true);
    });

    it("sin fecha de expiración no se considera expirada", () => {
      expect(isOfferExpired(null)).toBe(false);
    });
  });

  describe("buildWaitlistRange", () => {
    it("construye la ventana desde el horario seleccionado y la duración", () => {
      expect(buildWaitlistRange("10:00", 45)).toEqual({
        desiredStartFrom: "10:00",
        desiredStartTo: "10:45",
      });
    });

    it("usa 30 minutos por defecto si no hay duración", () => {
      expect(buildWaitlistRange("10:00", null)).toEqual({
        desiredStartFrom: "10:00",
        desiredStartTo: "10:30",
      });
    });

    it("devuelve el día completo si no hay horario seleccionado", () => {
      expect(buildWaitlistRange(null, 30)).toEqual({
        desiredStartFrom: "00:00",
        desiredStartTo: "23:59",
      });
    });
  });
});
