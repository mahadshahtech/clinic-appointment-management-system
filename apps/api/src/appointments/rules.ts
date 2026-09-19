import type { AppointmentStatus } from "@nfc/contracts";
import { formatInTimeZone } from "date-fns-tz";
import { ApiError } from "../http/api-error.js";
import { CLINIC_TIMEZONE, clinicDateTimeToUtc } from "../scheduling/timezone.js";

export const MUTABLE_PATIENT_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];
export const CANCELLATION_CUTOFF_MS = 2 * 60 * 60 * 1000;

export function parseSlot(date: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const minuteOfDay = hours! * 60 + minutes!;
  const startAt = clinicDateTimeToUtc(date, minuteOfDay);
  return { minuteOfDay, startAt, endAt: new Date(startAt.getTime() + 30 * 60 * 1000) };
}

export function assertFuture(startAt: Date, now: Date) {
  if (startAt.getTime() <= now.getTime()) throw new ApiError(422, "INVALID_APPOINTMENT_TIME", "Appointment time must be in the future.");
}

export function assertScheduleAllowsSlot(minuteOfDay: number, ranges: Array<{ startMinute: number; endMinute: number }>, isLeave: boolean) {
  if (!ranges.some((range) => minuteOfDay >= range.startMinute && minuteOfDay + 30 <= range.endMinute)) {
    throw new ApiError(422, "INVALID_APPOINTMENT_TIME", "The requested time is outside the doctor's working schedule.");
  }
  if (isLeave) throw new ApiError(409, "SLOT_UNAVAILABLE", "The doctor is on leave on this date.");
}

export function assertBeforeCutoff(startAt: Date, now: Date) {
  if (startAt.getTime() - now.getTime() < CANCELLATION_CUTOFF_MS) throw new ApiError(409, "CUTOFF_PASSED", "Appointments can only be changed at least two hours before the start time.");
}

export function canPatientModify(status: AppointmentStatus, startAt: Date, now: Date) {
  return MUTABLE_PATIENT_STATUSES.includes(status) && startAt.getTime() - now.getTime() >= CANCELLATION_CUTOFF_MS;
}

export function localAppointmentParts(startAt: Date, endAt: Date) {
  return {
    localDate: formatInTimeZone(startAt, CLINIC_TIMEZONE, "yyyy-MM-dd"),
    localStartTime: formatInTimeZone(startAt, CLINIC_TIMEZONE, "HH:mm"),
    localEndTime: formatInTimeZone(endAt, CLINIC_TIMEZONE, "HH:mm"),
  };
}
