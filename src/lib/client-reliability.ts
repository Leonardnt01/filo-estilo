export type ClientReliabilityLevel = "confiable" | "neutral" | "alerta";

export type ClientHistoryStats = {
  completed: number;
  noShows: number;
};

export type ClientReliability = {
  level: ClientReliabilityLevel;
  label: string;
  description: string;
  completed: number;
  no_shows: number;
};

/**
 * Classifies a client's booking reliability from their appointment history.
 *
 * - "alerta": repeated no-shows, or their only history is a no-show.
 * - "confiable": attended at least 2 appointments and never missed one,
 *   or has a strong attendance record with at most one slip.
 * - "neutral": new client or not enough history to judge.
 */
export function classifyClientReliability(stats: ClientHistoryStats): ClientReliability {
  const completed = Math.max(0, stats.completed);
  const noShows = Math.max(0, stats.noShows);
  const base = { completed, no_shows: noShows };

  if (noShows >= 2 || (noShows === 1 && completed === 0)) {
    return {
      ...base,
      level: "alerta",
      label: "Alerta",
      description:
        noShows >= 2
          ? `No se presentó a ${noShows} citas`
          : "No se presentó a su única cita registrada",
    };
  }

  if (completed >= 2 && noShows === 0) {
    return {
      ...base,
      level: "confiable",
      label: "Confiable",
      description: `Asistió a sus ${completed} citas`,
    };
  }

  if (completed >= 4 && noShows === 1) {
    return {
      ...base,
      level: "confiable",
      label: "Confiable",
      description: `Asistió a ${completed} citas (1 inasistencia)`,
    };
  }

  return {
    ...base,
    level: "neutral",
    label: "Neutral",
    description:
      completed === 0 && noShows === 0
        ? "Cliente nuevo, sin historial de citas"
        : "Historial breve, aún sin patrón claro",
  };
}
