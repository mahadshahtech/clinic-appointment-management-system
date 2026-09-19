import { describe, expect, it } from "vitest";
import { appointmentSlotInputSchema, rescheduleAppointmentInputSchema,visitNoteInputSchema } from "./appointments.js";

const doctorId="10000000-0000-4000-8000-000000000001";
describe("appointment contracts",()=>{
  it("accepts a valid aligned clinic slot",()=>expect(appointmentSlotInputSchema.parse({doctorId,date:"2030-01-07",startTime:"09:30"})).toBeDefined());
  it("rejects unaligned times",()=>expect(appointmentSlotInputSchema.safeParse({doctorId,date:"2030-01-07",startTime:"09:15"}).success).toBe(false));
  it.each(["patientId","status","duration"])("rejects forged %s",field=>expect(appointmentSlotInputSchema.safeParse({doctorId,date:"2030-01-07",startTime:"09:00",[field]:"forged"}).success).toBe(false));
  it("does not allow changing doctor while rescheduling",()=>expect(rescheduleAppointmentInputSchema.safeParse({doctorId,date:"2030-01-07",startTime:"10:00"}).success).toBe(false));
  it("trims visit notes and rejects blank or over-limit content",()=>{expect(visitNoteInputSchema.parse({note:"  improving  "}).note).toBe("improving");expect(visitNoteInputSchema.safeParse({note:"   "}).success).toBe(false);expect(visitNoteInputSchema.safeParse({note:"x".repeat(2001)}).success).toBe(false);});
});
