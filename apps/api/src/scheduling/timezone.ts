import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const CLINIC_TIMEZONE = "Asia/Karachi" as const;

export function clinicWeekday(date: string) {
  const instant = fromZonedTime(`${date}T12:00:00`, CLINIC_TIMEZONE);
  return Number(formatInTimeZone(instant, CLINIC_TIMEZONE, "i")) % 7;
}

export function clinicDateTimeToUtc(date: string, minuteOfDay: number) {
  const hours = Math.floor(minuteOfDay / 60).toString().padStart(2, "0");
  const minutes = (minuteOfDay % 60).toString().padStart(2, "0");
  return fromZonedTime(`${date}T${hours}:${minutes}:00`, CLINIC_TIMEZONE);
}

export function clinicDayBounds(date: string) {
  const start = clinicDateTimeToUtc(date, 0);
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end: next };
}

export function clinicToday(now = new Date()) {
  return formatInTimeZone(now, CLINIC_TIMEZONE, "yyyy-MM-dd");
}

export function formatMinute(minute: number) {
  return `${Math.floor(minute / 60).toString().padStart(2, "0")}:${(minute % 60).toString().padStart(2, "0")}`;
}
