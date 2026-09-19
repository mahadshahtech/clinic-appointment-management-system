import type { Availability, DoctorLeave, DoctorPublic, LeaveInput, WorkingHour, WorkingHourInput } from "@nfc/contracts";

export interface SchedulingService {
  listDoctors(filters: { q?: string | undefined; specialty?: string | undefined }): Promise<DoctorPublic[]>;
  getDoctor(doctorId: string): Promise<DoctorPublic>;
  getAvailability(doctorId: string, date: string): Promise<Availability>;
  listOwnSchedule(profileId: string): Promise<WorkingHour[]>;
  createOwnSchedule(profileId: string, input: WorkingHourInput): Promise<WorkingHour>;
  updateOwnSchedule(profileId: string, rangeId: string, input: WorkingHourInput): Promise<WorkingHour>;
  deleteOwnSchedule(profileId: string, rangeId: string): Promise<void>;
  listOwnLeave(profileId: string): Promise<DoctorLeave[]>;
  createOwnLeave(profileId: string, input: LeaveInput): Promise<DoctorLeave>;
  deleteOwnLeave(profileId: string, leaveId: string): Promise<void>;
}
