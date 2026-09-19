import type { WorkingHour } from "@nfc/contracts";
import { describe, expect, it } from "vitest";
import { deriveAvailability, holdsSlot } from "../src/scheduling/availability.js";
import { clinicDateTimeToUtc, clinicWeekday } from "../src/scheduling/timezone.js";

const doctorId = "00000000-0000-4000-8000-000000000001";
const monday: WorkingHour[] = [{ id: "00000000-0000-4000-8000-000000000002", dayOfWeek: 1, startMinute: 540, endMinute: 660 }];
const derive = (overrides: Partial<Parameters<typeof deriveAvailability>[0]> = {}) => deriveAvailability({ doctorId, date: "2030-01-07", workingHours: monday, occupiedStarts: [], isLeave: false, now: new Date("2029-01-01T00:00:00Z"), ...overrides });

describe("server-derived availability", () => {
  it("generates four half-hour starts and excludes the range end", () => {
    expect(derive().slots.map((slot) => slot.localTime)).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });
  it.each([["09:30", ["09:00","10:00","10:30"]], ["10:00", ["09:00","09:30","10:30"]]])("removes occupied %s", (time, expected) => {
    const [hour, minute] = time.split(":").map(Number);
    expect(derive({ occupiedStarts: [clinicDateTimeToUtc("2030-01-07", hour! * 60 + minute!)] }).slots.map((slot) => slot.localTime)).toEqual(expected);
  });
  it("returns no slots on leave", () => expect(derive({ isLeave: true })).toMatchObject({ slots: [], reason: "LEAVE" }));
  it("returns no slots without working hours", () => expect(derive({ workingHours: [] })).toMatchObject({ slots: [], reason: "NO_WORKING_HOURS" }));
  it.each(["PENDING","CONFIRMED"])("treats %s as reserving", (status) => expect(holdsSlot(status)).toBe(true));
  it.each(["CANCELLED","REJECTED","COMPLETED","NO_SHOW"])("does not treat %s as reserving", (status) => expect(holdsSlot(status)).toBe(false));
  it("calculates the clinic weekday without server-local timezone", () => expect(clinicWeekday("2030-01-07")).toBe(1));
});
