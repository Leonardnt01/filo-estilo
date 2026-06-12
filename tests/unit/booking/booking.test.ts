import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addMinutes,
  isFutureAppointment,
  validateBookingWindow,
} from "../../../src/lib/booking";

describe("booking helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-12T10:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("suma minutos correctamente a una hora base", () => {
    expect(addMinutes("09:00", 30)).toBe("09:30");
    expect(addMinutes("09:45", 30)).toBe("10:15");
    expect(addMinutes("23:45", 30)).toBe("24:15");
  });

  it("rechaza fechas de reserva en el pasado", () => {
    expect(validateBookingWindow("2026-06-11")).toBe(
      "Appointment date cannot be in the past",
    );
  });

  it("rechaza fechas fuera de la ventana de 60 dias", () => {
    expect(validateBookingWindow("2026-08-12")).toBe(
      "Appointment date exceeds booking window (60 days)",
    );
  });

  it("acepta fechas dentro de la ventana permitida", () => {
    expect(validateBookingWindow("2026-06-12")).toBeNull();
    expect(validateBookingWindow("2026-07-15")).toBeNull();
    expect(validateBookingWindow("2026-08-11")).toBeNull();
  });

  it("detecta una cita futura correctamente", () => {
    expect(isFutureAppointment("2026-06-12", "11:00")).toBe(true);
    expect(isFutureAppointment("2026-06-13", "09:00")).toBe(true);
  });

  it("detecta cuando una cita ya no es futura", () => {
    expect(isFutureAppointment("2026-06-12", "09:00")).toBe(false);
    expect(isFutureAppointment("2026-06-11", "23:59")).toBe(false);
  });
});
