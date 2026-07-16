import { describe, expect, it } from "vitest";

import { classifyClientReliability } from "../../../src/lib/client-reliability";

describe("clasificación de confiabilidad del cliente", () => {
  describe("nivel alerta", () => {
    it("marca alerta con 2 o más no-shows", () => {
      const result = classifyClientReliability({ completed: 5, noShows: 2 });
      expect(result.level).toBe("alerta");
      expect(result.description).toContain("2");
    });

    it("marca alerta si su única cita registrada fue un no-show", () => {
      const result = classifyClientReliability({ completed: 0, noShows: 1 });
      expect(result.level).toBe("alerta");
    });

    it("marca alerta con muchos no-shows aunque tenga asistencias", () => {
      expect(classifyClientReliability({ completed: 10, noShows: 3 }).level).toBe("alerta");
    });
  });

  describe("nivel confiable", () => {
    it("marca confiable con 2+ citas asistidas y cero no-shows", () => {
      const result = classifyClientReliability({ completed: 2, noShows: 0 });
      expect(result.level).toBe("confiable");
      expect(result.description).toContain("2");
    });

    it("marca confiable con historial largo y solo 1 tropiezo", () => {
      const result = classifyClientReliability({ completed: 4, noShows: 1 });
      expect(result.level).toBe("confiable");
    });
  });

  describe("nivel neutral", () => {
    it("marca neutral a un cliente nuevo sin historial", () => {
      const result = classifyClientReliability({ completed: 0, noShows: 0 });
      expect(result.level).toBe("neutral");
      expect(result.description).toContain("nuevo");
    });

    it("marca neutral con una sola asistencia (historial breve)", () => {
      expect(classifyClientReliability({ completed: 1, noShows: 0 }).level).toBe("neutral");
    });

    it("marca neutral con 1 no-show pero pocas asistencias (2-3)", () => {
      expect(classifyClientReliability({ completed: 2, noShows: 1 }).level).toBe("neutral");
      expect(classifyClientReliability({ completed: 3, noShows: 1 }).level).toBe("neutral");
    });
  });

  describe("robustez", () => {
    it("tolera valores negativos normalizándolos a cero", () => {
      const result = classifyClientReliability({ completed: -1, noShows: -2 });
      expect(result.level).toBe("neutral");
      expect(result.completed).toBe(0);
      expect(result.no_shows).toBe(0);
    });

    it("incluye los contadores en el resultado", () => {
      const result = classifyClientReliability({ completed: 3, noShows: 2 });
      expect(result.completed).toBe(3);
      expect(result.no_shows).toBe(2);
    });
  });
});
