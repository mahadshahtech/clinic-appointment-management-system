import { z } from "zod";
import { clinicDateSchema, uuidSchema } from "./scheduling.js";

export const appointmentStatusSchema = z.enum(["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED", "REJECTED"]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export const VISIT_NOTE_MAX_LENGTH=2000;
export const visitNoteInputSchema=z.object({note:z.string().trim().min(1,"Visit note is required.").max(VISIT_NOTE_MAX_LENGTH)}).strict();
export type VisitNoteInput=z.infer<typeof visitNoteInputSchema>;
export const visitNoteSchema=z.object({id:uuidSchema,appointmentId:uuidSchema,note:z.string(),createdAt:z.string().datetime()});
export type VisitNote=z.infer<typeof visitNoteSchema>;

export const appointmentTimeSchema = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, "Time must use HH:mm and align to 30 minutes.");
export const appointmentSlotInputSchema = z.object({
  doctorId: uuidSchema,
  date: clinicDateSchema,
  startTime: appointmentTimeSchema,
}).strict();
export type AppointmentSlotInput = z.infer<typeof appointmentSlotInputSchema>;

export const rescheduleAppointmentInputSchema = z.object({ date: clinicDateSchema, startTime: appointmentTimeSchema }).strict();
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentInputSchema>;

export const patientAppointmentSchema = z.object({
  id: uuidSchema,
  doctor: z.object({ id: uuidSchema, fullName: z.string(), specialization: z.string(), consultationLocation: z.string() }),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  localDate: clinicDateSchema,
  localStartTime: appointmentTimeSchema,
  localEndTime: appointmentTimeSchema,
  status: appointmentStatusSchema,
  createdAt: z.string().datetime(),
  canCancel: z.boolean(),
  canReschedule: z.boolean(),
  visitNote: visitNoteSchema.nullable(),
});
export type PatientAppointment = z.infer<typeof patientAppointmentSchema>;

export const doctorAppointmentSchema = z.object({
  id: uuidSchema,
  patient: z.object({ id: uuidSchema, fullName: z.string(), phone: z.string() }),
  startAt: z.string().datetime(), endAt: z.string().datetime(), localDate: clinicDateSchema,
  localStartTime: appointmentTimeSchema, localEndTime: appointmentTimeSchema,
  status: appointmentStatusSchema, createdAt: z.string().datetime(),
  canConfirm: z.boolean(), canReject: z.boolean(), canComplete: z.boolean(), canMarkNoShow: z.boolean(),
  visitNote: visitNoteSchema.nullable(),
});
export type DoctorAppointment = z.infer<typeof doctorAppointmentSchema>;

export const doctorPatientSchema = z.object({
  id: uuidSchema, fullName: z.string(), phone: z.string(), appointmentCount: z.number().int().positive(),
  lastAppointmentAt: z.string().datetime().nullable(), nextAppointmentAt: z.string().datetime().nullable(),
});
export type DoctorPatient = z.infer<typeof doctorPatientSchema>;
