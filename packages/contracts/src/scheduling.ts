import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const clinicDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}, "Date is invalid.");

export const doctorPublicSchema = z.object({
  id: uuidSchema, fullName: z.string(), specialization: z.string(), qualifications: z.string(), bio: z.string(),
  experienceYears: z.number().int().nonnegative(), consultationLocation: z.string(),
});
export type DoctorPublic = z.infer<typeof doctorPublicSchema>;

export const doctorDirectoryQuerySchema = z.object({ q: z.string().trim().max(100).optional(), specialty: z.string().trim().max(160).optional() });

export const workingHourInputSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439).refine((v) => v % 30 === 0, "Start time must align to 30 minutes."),
  endMinute: z.number().int().min(1).max(1440).refine((v) => v % 30 === 0, "End time must align to 30 minutes."),
}).refine((value) => value.startMinute < value.endMinute, { message: "End time must be after start time.", path: ["endMinute"] });
export type WorkingHourInput = z.infer<typeof workingHourInputSchema>;
export const workingHourSchema = workingHourInputSchema.and(z.object({ id: uuidSchema }));
export type WorkingHour = z.infer<typeof workingHourSchema>;

export const leaveInputSchema = z.object({ leaveDate: clinicDateSchema, reason: z.string().trim().max(500).optional() });
export type LeaveInput = z.infer<typeof leaveInputSchema>;
export const doctorLeaveSchema = leaveInputSchema.and(z.object({ id: uuidSchema, createdAt: z.string().datetime() }));
export type DoctorLeave = z.infer<typeof doctorLeaveSchema>;

export const availabilityQuerySchema = z.object({ date: clinicDateSchema });
export const availabilityReasonSchema = z.enum(["LEAVE", "NO_WORKING_HOURS", "FULLY_BOOKED"]).nullable();
export const availabilitySchema = z.object({
  doctorId: uuidSchema, date: clinicDateSchema, timezone: z.literal("Asia/Karachi"), reason: availabilityReasonSchema,
  slots: z.array(z.object({ startAt: z.string().datetime(), localTime: z.string().regex(/^\d{2}:\d{2}$/) })),
});
export type Availability = z.infer<typeof availabilitySchema>;
