import { z } from "zod";
import { uuidSchema } from "./scheduling.js";

export const createDoctorInputSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(5).max(32),
  specialization: z.string().trim().min(2).max(160),
  qualifications: z.string().trim().min(2).max(2000),
  experienceYears: z.coerce.number().int().min(0).max(80),
  consultationLocation: z.string().trim().min(2).max(240),
  bio: z.string().trim().min(10).max(2000),
}).strict();
export type CreateDoctorInput = z.infer<typeof createDoctorInputSchema>;

export const adminDoctorSchema = createDoctorInputSchema.omit({ experienceYears: true }).extend({
  id: uuidSchema, profileId: uuidSchema, experienceYears: z.number().int().nonnegative(), isActive: z.boolean(), createdAt: z.string().datetime(),
});
export type AdminDoctor = z.infer<typeof adminDoctorSchema>;
export const adminDoctorQuerySchema = z.object({ q: z.string().trim().max(100).optional() });
export const updateDoctorStatusSchema = z.object({ isActive: z.boolean() }).strict();
