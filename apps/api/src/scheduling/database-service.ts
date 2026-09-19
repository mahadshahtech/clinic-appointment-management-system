import type { DoctorLeave, DoctorPublic } from "@nfc/contracts";
import { and, asc, eq, gte, ilike, inArray, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Database } from "../db/client.js";
import { appointmentEvents,appointments, doctors, doctorLeave, doctorWorkingHours, profiles } from "../db/schema/index.js";
import { ApiError } from "../http/api-error.js";
import { deriveAvailability, holdsSlot } from "./availability.js";
import { appointmentStatusValues } from "../db/schema/enums.js";
import { clinicDayBounds, clinicToday, clinicWeekday } from "./timezone.js";
import type { SchedulingService } from "./types.js";
import { enqueueAppointmentEmail } from "../automation/outbox.js";
const leaveDoctorProfiles=alias(profiles,"leave_doctor_profiles");

function translateDatabaseError(error: unknown, conflictMessage = "This schedule overlaps an existing range or duplicate record."): never {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "23505" || code === "23P01") throw new ApiError(409, "CONFLICT", conflictMessage);
  if (code === "23514") throw new ApiError(422, "VALIDATION_ERROR", "The schedule violates clinic time rules.");
  throw error;
}

export function createSchedulingService(database: Database): SchedulingService {
  const publicFields = { id: doctors.id, fullName: profiles.fullName, specialization: doctors.specialization, qualifications: doctors.qualifications, bio: doctors.bio, experienceYears: doctors.experienceYears, consultationLocation: doctors.consultationLocation };
  async function ownDoctorId(profileId: string) {
    const [record] = await database.select({ id: doctors.id }).from(doctors).where(eq(doctors.profileId, profileId)).limit(1);
    if (!record) throw new ApiError(404, "NOT_FOUND", "No doctor record is linked to this profile.");
    return record.id;
  }
  async function activeDoctor(doctorId: string): Promise<DoctorPublic> {
    const [record] = await database.select(publicFields).from(doctors).innerJoin(profiles, eq(doctors.profileId, profiles.id)).where(and(eq(doctors.id, doctorId), eq(doctors.isActive, true), eq(profiles.isActive, true))).limit(1);
    if (!record) throw new ApiError(404, "NOT_FOUND", "Doctor was not found.");
    return record;
  }

  return {
    async listDoctors(filters) {
      const predicates = [eq(doctors.isActive, true), eq(profiles.isActive, true)];
      if (filters.q) predicates.push(or(ilike(profiles.fullName, `%${filters.q}%`), ilike(doctors.specialization, `%${filters.q}%`))!);
      if (filters.specialty) predicates.push(ilike(doctors.specialization, `%${filters.specialty}%`));
      return database.select(publicFields).from(doctors).innerJoin(profiles, eq(doctors.profileId, profiles.id)).where(and(...predicates)).orderBy(asc(profiles.fullName));
    },
    getDoctor: activeDoctor,
    async getAvailability(doctorId, date) {
      await activeDoctor(doctorId);
      const dayOfWeek = clinicWeekday(date);
      const [ranges, leave, occupied] = await Promise.all([
        database.select({ id: doctorWorkingHours.id, dayOfWeek: doctorWorkingHours.dayOfWeek, startMinute: doctorWorkingHours.startMinute, endMinute: doctorWorkingHours.endMinute }).from(doctorWorkingHours).where(and(eq(doctorWorkingHours.doctorId, doctorId), eq(doctorWorkingHours.dayOfWeek, dayOfWeek))).orderBy(asc(doctorWorkingHours.startMinute)),
        database.select({ id: doctorLeave.id }).from(doctorLeave).where(and(eq(doctorLeave.doctorId, doctorId), eq(doctorLeave.leaveDate, date))).limit(1),
        (() => { const bounds = clinicDayBounds(date); const reserving = appointmentStatusValues.filter(holdsSlot); return database.select({ startAt: appointments.startAt }).from(appointments).where(and(eq(appointments.doctorId, doctorId), inArray(appointments.status, reserving), gte(appointments.startAt, bounds.start), lt(appointments.startAt, bounds.end))); })(),
      ]);
      return deriveAvailability({ doctorId, date, workingHours: ranges, occupiedStarts: occupied.map((row) => row.startAt), isLeave: leave.length > 0 });
    },
    async listOwnSchedule(profileId) {
      const doctorId = await ownDoctorId(profileId);
      return database.select({ id: doctorWorkingHours.id, dayOfWeek: doctorWorkingHours.dayOfWeek, startMinute: doctorWorkingHours.startMinute, endMinute: doctorWorkingHours.endMinute }).from(doctorWorkingHours).where(eq(doctorWorkingHours.doctorId, doctorId)).orderBy(asc(doctorWorkingHours.dayOfWeek), asc(doctorWorkingHours.startMinute));
    },
    async createOwnSchedule(profileId, input) {
      try { const doctorId = await ownDoctorId(profileId); const [created] = await database.insert(doctorWorkingHours).values({ doctorId, ...input }).returning({ id: doctorWorkingHours.id, dayOfWeek: doctorWorkingHours.dayOfWeek, startMinute: doctorWorkingHours.startMinute, endMinute: doctorWorkingHours.endMinute }); return created!; } catch (error) { translateDatabaseError(error); }
    },
    async updateOwnSchedule(profileId, rangeId, input) {
      try { const doctorId = await ownDoctorId(profileId); const [updated] = await database.update(doctorWorkingHours).set(input).where(and(eq(doctorWorkingHours.id, rangeId), eq(doctorWorkingHours.doctorId, doctorId))).returning({ id: doctorWorkingHours.id, dayOfWeek: doctorWorkingHours.dayOfWeek, startMinute: doctorWorkingHours.startMinute, endMinute: doctorWorkingHours.endMinute }); if (!updated) throw new ApiError(404, "NOT_FOUND", "Schedule range was not found."); return updated; } catch (error) { if (error instanceof ApiError) throw error; translateDatabaseError(error); }
    },
    async deleteOwnSchedule(profileId, rangeId) { const doctorId = await ownDoctorId(profileId); const deleted = await database.delete(doctorWorkingHours).where(and(eq(doctorWorkingHours.id, rangeId), eq(doctorWorkingHours.doctorId, doctorId))).returning({ id: doctorWorkingHours.id }); if (!deleted.length) throw new ApiError(404, "NOT_FOUND", "Schedule range was not found."); },
    async listOwnLeave(profileId) { const doctorId = await ownDoctorId(profileId); const rows = await database.select({ id: doctorLeave.id, leaveDate: doctorLeave.leaveDate, reason: doctorLeave.reason, createdAt: doctorLeave.createdAt }).from(doctorLeave).where(eq(doctorLeave.doctorId, doctorId)).orderBy(asc(doctorLeave.leaveDate)); return rows.map((row): DoctorLeave => ({ ...row, reason: row.reason ?? undefined, createdAt: row.createdAt.toISOString() })); },
    async createOwnLeave(profileId, input) { if (input.leaveDate < clinicToday()) throw new ApiError(422, "VALIDATION_ERROR", "Leave cannot be added in the past."); try { const doctorId = await ownDoctorId(profileId);return await database.transaction(async tx=>{const [created] = await tx.insert(doctorLeave).values({ doctorId, leaveDate: input.leaveDate, reason: input.reason }).returning({ id: doctorLeave.id, leaveDate: doctorLeave.leaveDate, reason: doctorLeave.reason, createdAt: doctorLeave.createdAt });const bounds=clinicDayBounds(input.leaveDate);const affected=await tx.select({id:appointments.id,status:appointments.status,startAt:appointments.startAt,recipient:profiles.email,patientName:profiles.fullName,doctorName:leaveDoctorProfiles.fullName}).from(appointments).innerJoin(profiles,eq(appointments.patientId,profiles.id)).innerJoin(doctors,eq(appointments.doctorId,doctors.id)).innerJoin(leaveDoctorProfiles,eq(doctors.profileId,leaveDoctorProfiles.id)).where(and(eq(appointments.doctorId,doctorId),inArray(appointments.status,["PENDING","CONFIRMED"]),gte(appointments.startAt,bounds.start),lt(appointments.startAt,bounds.end)));for(const item of affected){await tx.update(appointments).set({status:"CANCELLED",cancelledAt:new Date(),cancellationReason:"Doctor leave"}).where(and(eq(appointments.id,item.id),inArray(appointments.status,["PENDING","CONFIRMED"])));await tx.insert(appointmentEvents).values({appointmentId:item.id,eventType:"APPOINTMENT_CANCELLED_DOCTOR_LEAVE",fromStatus:item.status,toStatus:"CANCELLED",actorProfileId:profileId,metadata:{reason:"DOCTOR_LEAVE",leaveDate:input.leaveDate}});if(item.recipient)await enqueueAppointmentEmail(tx,{type:"APPOINTMENT_CANCELLATION_EMAIL",appointmentId:item.id,recipient:item.recipient,patientName:item.patientName,doctorName:item.doctorName,startAt:item.startAt,reason:"Doctor unavailable on this date",key:`doctor-leave:${item.id}:${input.leaveDate}`});}return { ...created!, reason: created!.reason ?? undefined, createdAt: created!.createdAt.toISOString() };}); } catch (error) {if(error instanceof ApiError)throw error; translateDatabaseError(error, "Leave already exists for this date."); } },
    async deleteOwnLeave(profileId, leaveId) { const doctorId = await ownDoctorId(profileId); const [record] = await database.select({ leaveDate: doctorLeave.leaveDate }).from(doctorLeave).where(and(eq(doctorLeave.id, leaveId), eq(doctorLeave.doctorId, doctorId))).limit(1); if (!record) throw new ApiError(404, "NOT_FOUND", "Leave record was not found."); if (record.leaveDate <= clinicToday()) throw new ApiError(422, "VALIDATION_ERROR", "Only future leave can be removed."); await database.delete(doctorLeave).where(and(eq(doctorLeave.id, leaveId), eq(doctorLeave.doctorId, doctorId))); },
  };
}
