import { z } from "zod";

export const userRoleSchema = z.enum(["PATIENT", "DOCTOR", "ADMIN"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const safeProfileSchema = z.object({
  id: z.string().uuid(),
  role: userRoleSchema,
  fullName: z.string(),
  phone: z.string(),
  dateOfBirth: z.string().nullable(),
  gender: z.string().nullable(),
  isActive: z.boolean(),
});
export type SafeProfile = z.infer<typeof safeProfileSchema>;

export const authMeSchema = z.object({
  user: z.object({ id: z.string().uuid(), email: z.string().email().nullable() }),
  profile: safeProfileSchema,
});
export type AuthMe = z.infer<typeof authMeSchema>;

export const patientProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(32),
  dateOfBirth: z.string().date().nullable(),
  gender: z.string().trim().max(40).nullable(),
});
export type PatientProfileUpdateInput = z.infer<typeof patientProfileUpdateSchema>;

export const patientSignupSchema = z
  .object({
    fullName: z.string().trim().min(2).max(160),
    phone: z.string().trim().min(7).max(32),
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type PatientSignupInput = z.infer<typeof patientSignupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;
