import { z } from "zod";

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const hhmmString = z
  .string()
  .regex(HHMM_REGEX, "Time must be in HH:MM format");

export function isStartBeforeEnd(startTime: string, endTime: string) {
  return startTime < endTime;
}
