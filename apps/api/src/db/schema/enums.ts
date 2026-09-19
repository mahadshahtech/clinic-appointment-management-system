import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleValues = ["PATIENT", "DOCTOR", "ADMIN"] as const;
export const appointmentStatusValues = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
  "REJECTED",
] as const;
export const automationEventStatusValues = ["PENDING", "PROCESSING", "SENT", "FAILED"] as const;

export const userRoleEnum = pgEnum("user_role", userRoleValues);
export const appointmentStatusEnum = pgEnum("appointment_status", appointmentStatusValues);
export const automationEventStatusEnum = pgEnum("automation_event_status", automationEventStatusValues);
