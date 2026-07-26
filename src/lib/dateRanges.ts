import { addWeeks, startOfWeek } from "date-fns";

export function getWeekIsoRange(date: Date): {
  fromISO: string;
  toISO: string;
} {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return {
    fromISO: weekStart.toISOString(),
    toISO: addWeeks(weekStart, 1).toISOString(),
  };
}
