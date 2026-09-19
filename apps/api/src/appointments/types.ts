import type { AppointmentSlotInput, PatientAppointment, RescheduleAppointmentInput } from "@nfc/contracts";

export interface AppointmentService {
  book(patientProfileId: string, input: AppointmentSlotInput): Promise<PatientAppointment>;
  list(patientProfileId: string): Promise<PatientAppointment[]>;
  get(patientProfileId: string, appointmentId: string): Promise<PatientAppointment>;
  cancel(patientProfileId: string, appointmentId: string): Promise<PatientAppointment>;
  reschedule(patientProfileId: string, appointmentId: string, input: RescheduleAppointmentInput): Promise<PatientAppointment>;
}
