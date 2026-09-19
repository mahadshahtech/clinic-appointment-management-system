import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "PROFILE_UNAVAILABLE",
  "SLOT_UNAVAILABLE",
  "PATIENT_TIME_CONFLICT",
  "APPOINTMENT_NOT_CANCELLABLE",
  "APPOINTMENT_NOT_RESCHEDULABLE",
  "CUTOFF_PASSED",
  "INVALID_APPOINTMENT_TIME",
  "APPOINTMENT_NOT_CONFIRMABLE",
  "APPOINTMENT_NOT_REJECTABLE",
  "APPOINTMENT_NOT_COMPLETABLE",
  "APPOINTMENT_NOT_NO_SHOW_ELIGIBLE",
  "APPOINTMENT_NOT_STARTED",
  "VISIT_NOTE_NOT_ALLOWED",
  "VISIT_NOTE_ALREADY_EXISTS",
  "VISIT_NOTE_NOT_FOUND",
  "DOCTOR_EMAIL_EXISTS",
  "INVITATION_UNAVAILABLE",
  "INVITATION_FAILED",
  "INTERNAL_ERROR",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const healthStatusSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("nfc-api"),
  version: z.string().min(1),
  timestamp: z.string().datetime(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
