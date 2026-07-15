import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canConfirmAttendance,
  canDeclineAttendance,
  canMarkNoShow,
  isAttendanceAtRisk,
} from "../../../src/lib/booking";

describe("reglas de asistencia (no-show)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-12T10:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("canConfirmAttendance", () => {
    it("permite confirmar una cita futura pendiente", () => {
      expect(
        canConfirmAttendance({
          status: "pending",
          attendanceStatus: "pending",
          appointmentDate: "2026-06-13",
          startTime: "10:00",
        }),
      ).toBe(true);
    });

    it("rechaza confirmar si la asistencia ya fue confirmada", () => {
      expect(
        canConfirmAttendance({
          status: "confirmed",
          attendanceStatus: "confirmed",
          appointmentDate: "2026-06-13",
          startTime: "10:00",
        }),
      ).toBe(false);
    });

    it("rechaza confirmar una cita que ya pasó", () => {
      expect(
        canConfirmAttendance({
          status: "pending",
          attendanceStatus: "pending",
          appointmentDate: "2026-06-11",
          startTime: "10:00",
        }),
      ).toBe(false);
    });

    it("rechaza confirmar una cita cancelada", () => {
      expect(
        canConfirmAttendance({
          status: "cancelled",
          attendanceStatus: "pending",
          appointmentDate: "2026-06-13",
          startTime: "10:00",
        }),
      ).toBe(false);
    });
  });

  describe("canDeclineAttendance", () => {
    it("permite declinar una cita futura pendiente", () => {
      expect(
        canDeclineAttendance({
          status: "pending",
          attendanceStatus: "pending",
          appointmentDate: "2026-06-13",
          startTime: "10:00",
        }),
      ).toBe(true);
    });

    it("permite declinar una cita con asistencia ya confirmada", () => {
      expect(
        canDeclineAttendance({
          status: "confirmed",
          attendanceStatus: "confirmed",
          appointmentDate: "2026-06-13",
          startTime: "10:00",
        }),
      ).toBe(true);
    });

    it("rechaza declinar si ya fue declinada", () => {
      expect(
        canDeclineAttendance({
          status: "pending",
          attendanceStatus: "declined",
          appointmentDate: "2026-06-13",
          startTime: "10:00",
        }),
      ).toBe(false);
    });

    it("rechaza declinar una cita que ya pasó", () => {
      expect(
        canDeclineAttendance({
          status: "pending",
          attendanceStatus: "pending",
          appointmentDate: "2026-06-12",
          startTime: "09:00",
        }),
      ).toBe(false);
    });
  });

  describe("canMarkNoShow", () => {
    it("permite marcar no_show cuando la hora de inicio ya pasó", () => {
      expect(
        canMarkNoShow({
          status: "pending",
          appointmentDate: "2026-06-12",
          startTime: "09:30",
        }),
      ).toBe(true);
    });

    it("permite marcar no_show exactamente a la hora de inicio", () => {
      expect(
        canMarkNoShow({
          status: "confirmed",
          appointmentDate: "2026-06-12",
          startTime: "10:00",
        }),
      ).toBe(true);
    });

    it("rechaza marcar no_show a una cita futura", () => {
      expect(
        canMarkNoShow({
          status: "pending",
          appointmentDate: "2026-06-12",
          startTime: "10:30",
        }),
      ).toBe(false);
    });

    it("rechaza marcar no_show sobre una cita cancelada", () => {
      expect(
        canMarkNoShow({
          status: "cancelled",
          appointmentDate: "2026-06-12",
          startTime: "09:00",
        }),
      ).toBe(false);
    });

    it("rechaza marcar no_show sobre una cita completada", () => {
      expect(
        canMarkNoShow({
          status: "completed",
          appointmentDate: "2026-06-12",
          startTime: "09:00",
        }),
      ).toBe(false);
    });

    it("rechaza marcar no_show sobre una cita que ya es no_show", () => {
      expect(
        canMarkNoShow({
          status: "no_show",
          appointmentDate: "2026-06-12",
          startTime: "09:00",
        }),
      ).toBe(false);
    });
  });

  describe("isAttendanceAtRisk", () => {
    it("marca en riesgo una cita pendiente dentro de las 24 horas", () => {
      expect(
        isAttendanceAtRisk({
          status: "pending",
          attendanceStatus: "pending",
          appointmentDate: "2026-06-13",
          startTime: "09:00",
        }),
      ).toBe(true);
    });

    it("no marca en riesgo una cita a más de 24 horas", () => {
      expect(
        isAttendanceAtRisk({
          status: "pending",
          attendanceStatus: "pending",
          appointmentDate: "2026-06-14",
          startTime: "11:00",
        }),
      ).toBe(false);
    });

    it("no marca en riesgo una cita con asistencia confirmada", () => {
      expect(
        isAttendanceAtRisk({
          status: "confirmed",
          attendanceStatus: "confirmed",
          appointmentDate: "2026-06-13",
          startTime: "09:00",
        }),
      ).toBe(false);
    });

    it("no marca en riesgo una cita que ya pasó", () => {
      expect(
        isAttendanceAtRisk({
          status: "pending",
          attendanceStatus: "pending",
          appointmentDate: "2026-06-12",
          startTime: "09:00",
        }),
      ).toBe(false);
    });

    it("respeta un umbral personalizado de horas", () => {
      expect(
        isAttendanceAtRisk(
          {
            status: "pending",
            attendanceStatus: "pending",
            appointmentDate: "2026-06-12",
            startTime: "11:30",
          },
          1,
        ),
      ).toBe(false);

      expect(
        isAttendanceAtRisk(
          {
            status: "pending",
            attendanceStatus: "pending",
            appointmentDate: "2026-06-12",
            startTime: "10:30",
          },
          1,
        ),
      ).toBe(true);
    });
  });
});
