import type { Availability, WorkingHour } from "@nfc/contracts";
import { CLINIC_TIMEZONE, clinicDateTimeToUtc, formatMinute } from "./timezone.js";

export function holdsSlot(status: string) { return status === "PENDING" || status === "CONFIRMED"; }

export function deriveAvailability(input: {
  doctorId: string; date: string; workingHours: WorkingHour[]; occupiedStarts: Date[]; isLeave: boolean; now?: Date;
}): Availability {
  if (input.isLeave) return { doctorId: input.doctorId, date: input.date, timezone: CLINIC_TIMEZONE, reason: "LEAVE", slots: [] };
  if (!input.workingHours.length) return { doctorId: input.doctorId, date: input.date, timezone: CLINIC_TIMEZONE, reason: "NO_WORKING_HOURS", slots: [] };
  const occupied = new Set(input.occupiedStarts.map((value) => value.getTime()));
  const now = input.now ?? new Date();
  const slots = input.workingHours.flatMap((range) => {
    const starts = [];
    for (let minute = range.startMinute; minute < range.endMinute; minute += 30) {
      const start = clinicDateTimeToUtc(input.date, minute);
      if (!occupied.has(start.getTime()) && start > now) starts.push({ startAt: start.toISOString(), localTime: formatMinute(minute) });
    }
    return starts;
  });
  return { doctorId: input.doctorId, date: input.date, timezone: CLINIC_TIMEZONE, reason: slots.length ? null : "FULLY_BOOKED", slots };
}
