import { describe, expect, it } from "vitest";
import { availabilityQuerySchema, workingHourInputSchema } from "./scheduling.js";

describe("schedule validation", () => {
  it("accepts valid split-compatible ranges", () => {
    expect(workingHourInputSchema.safeParse({ dayOfWeek: 1, startMinute: 540, endMinute: 720 }).success).toBe(true);
    expect(workingHourInputSchema.safeParse({ dayOfWeek: 1, startMinute: 840, endMinute: 1020 }).success).toBe(true);
  });
  it("rejects reversed and unaligned ranges", () => {
    expect(workingHourInputSchema.safeParse({ dayOfWeek: 1, startMinute: 660, endMinute: 540 }).success).toBe(false);
    expect(workingHourInputSchema.safeParse({ dayOfWeek: 1, startMinute: 545, endMinute: 600 }).success).toBe(false);
  });
  it("rejects malformed calendar dates", () => expect(availabilityQuerySchema.safeParse({ date: "2030-02-30" }).success).toBe(false));
});
