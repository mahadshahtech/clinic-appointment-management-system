import { appointments, doctors, profiles } from "../schema/index.js";

/**
 * Explicit clinic-level projection. Visit-note content is intentionally absent.
 * Future admin repositories must select from this projection rather than joining visit_notes.
 */
export const adminAppointmentFields = {
  id: appointments.id,
  startAt: appointments.startAt,
  endAt: appointments.endAt,
  status: appointments.status,
  doctorId: appointments.doctorId,
  patientId: appointments.patientId,
  cancellationReason: appointments.cancellationReason,
  rejectionReason: appointments.rejectionReason,
  createdAt: appointments.createdAt,
  doctorProfileId: doctors.profileId,
  patientFullName: profiles.fullName,
} as const;
