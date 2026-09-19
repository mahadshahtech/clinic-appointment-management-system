import type { DoctorAppointment, DoctorPatient } from "@nfc/contracts";

export interface DoctorAppointmentService {
  list(profileId: string): Promise<DoctorAppointment[]>;
  get(profileId: string, appointmentId: string): Promise<DoctorAppointment>;
  confirm(profileId: string, appointmentId: string): Promise<DoctorAppointment>;
  reject(profileId: string, appointmentId: string): Promise<DoctorAppointment>;
  complete(profileId: string, appointmentId: string): Promise<DoctorAppointment>;
  markNoShow(profileId: string, appointmentId: string): Promise<DoctorAppointment>;
  listPatients(profileId: string): Promise<DoctorPatient[]>;
  patientHistory(profileId: string, patientId: string): Promise<DoctorAppointment[]>;
  expirePending(appointmentId: string): Promise<boolean>;
}
