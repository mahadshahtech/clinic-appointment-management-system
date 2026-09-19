import type { AppointmentStatus, PatientAppointment } from "@nfc/contracts";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import type { Database } from "../db/client.js";
import type { DatabaseTransaction } from "../db/transaction.js";
import { appointmentEvents, appointments, doctors, doctorLeave, doctorWorkingHours, profiles,visitNotes } from "../db/schema/index.js";
import { ApiError } from "../http/api-error.js";
import { clinicWeekday } from "../scheduling/timezone.js";
import { assertBeforeCutoff, assertFuture, assertScheduleAllowsSlot, canPatientModify, localAppointmentParts, MUTABLE_PATIENT_STATUSES, parseSlot } from "./rules.js";
import type { AppointmentService } from "./types.js";
import { alias } from "drizzle-orm/pg-core";
import { enqueueAppointmentEmail } from "../automation/outbox.js";
const doctorProfiles=alias(profiles,"appointment_doctor_profiles");

type Executor = Database | DatabaseTransaction;
type AppointmentRow = {
  id: string; doctorId: string; doctorName: string; specialization: string; consultationLocation: string;
  startAt: Date; endAt: Date; status: AppointmentStatus; createdAt: Date;
  noteId:string|null;noteContent:string|null;noteCreatedAt:Date|null;
};

function translateCollision(error: unknown): never {
  const record = typeof error === "object" && error ? error as Record<string, unknown> : {};
  if (String(record.code ?? "") === "23505") {
    const constraint = String(record.constraint_name ?? record.constraint ?? "");
    if (constraint.includes("patient_reserving")) throw new ApiError(409, "PATIENT_TIME_CONFLICT", "You already have an active appointment at this time.");
    throw new ApiError(409, "SLOT_UNAVAILABLE", "This appointment slot is no longer available.");
  }
  if (String(record.code ?? "") === "23514") throw new ApiError(422, "INVALID_APPOINTMENT_TIME", "Appointment duration or time is invalid.");
  throw error;
}

function present(row: AppointmentRow, now: Date): PatientAppointment {
  const allowed = canPatientModify(row.status, row.startAt, now);
  return {
    id: row.id,
    doctor: { id: row.doctorId, fullName: row.doctorName, specialization: row.specialization, consultationLocation: row.consultationLocation },
    startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString(), ...localAppointmentParts(row.startAt, row.endAt),
    status: row.status, createdAt: row.createdAt.toISOString(), canCancel: allowed, canReschedule: allowed,visitNote:row.noteId?{id:row.noteId,appointmentId:row.id,note:row.noteContent!,createdAt:row.noteCreatedAt!.toISOString()}:null,
  };
}

async function loadAppointment(executor: Executor, patientId: string, appointmentId: string, lock = false) {
  if(lock){const [locked]=await executor.select({id:appointments.id}).from(appointments).where(and(eq(appointments.id,appointmentId),eq(appointments.patientId,patientId))).limit(1).for("update");if(!locked)throw new ApiError(404,"NOT_FOUND","Appointment was not found.");}
  const query = executor.select({
    id: appointments.id, doctorId: appointments.doctorId, doctorName: profiles.fullName,
    specialization: doctors.specialization, consultationLocation: doctors.consultationLocation,
    startAt: appointments.startAt, endAt: appointments.endAt, status: appointments.status, createdAt: appointments.createdAt,noteId:visitNotes.id,noteContent:visitNotes.content,noteCreatedAt:visitNotes.createdAt,
  }).from(appointments).innerJoin(doctors, eq(appointments.doctorId, doctors.id)).innerJoin(profiles, eq(doctors.profileId, profiles.id)).leftJoin(visitNotes,eq(visitNotes.appointmentId,appointments.id))
    .where(and(eq(appointments.id, appointmentId), eq(appointments.patientId, patientId))).limit(1);
  const [row] = await query;
  if (!row) throw new ApiError(404, "NOT_FOUND", "Appointment was not found.");
  return row;
}

async function validateSlot(executor: Executor, patientId: string, doctorId: string, date: string, startTime: string, now: Date, excludeAppointmentId?: string) {
  const slot = parseSlot(date, startTime);
  assertFuture(slot.startAt, now);
  const [doctor] = await executor.select({ id: doctors.id }).from(doctors).innerJoin(profiles, eq(doctors.profileId, profiles.id))
    .where(and(eq(doctors.id, doctorId), eq(doctors.isActive, true), eq(profiles.isActive, true))).limit(1);
  if (!doctor) throw new ApiError(404, "NOT_FOUND", "Doctor was not found.");
  const [ranges, leave] = await Promise.all([
    executor.select({ startMinute: doctorWorkingHours.startMinute, endMinute: doctorWorkingHours.endMinute }).from(doctorWorkingHours).where(and(
      eq(doctorWorkingHours.doctorId, doctorId), eq(doctorWorkingHours.dayOfWeek, clinicWeekday(date)),
    )),
    executor.select({ id: doctorLeave.id }).from(doctorLeave).where(and(eq(doctorLeave.doctorId, doctorId), eq(doctorLeave.leaveDate, date))).limit(1),
  ]);
  assertScheduleAllowsSlot(slot.minuteOfDay, ranges, leave.length > 0);
  const doctorPredicates = [eq(appointments.doctorId, doctorId), eq(appointments.startAt, slot.startAt), inArray(appointments.status, MUTABLE_PATIENT_STATUSES)];
  const patientPredicates = [eq(appointments.patientId, patientId), eq(appointments.startAt, slot.startAt), inArray(appointments.status, MUTABLE_PATIENT_STATUSES)];
  if (excludeAppointmentId) { doctorPredicates.push(ne(appointments.id, excludeAppointmentId)); patientPredicates.push(ne(appointments.id, excludeAppointmentId)); }
  const [doctorConflict, patientConflict] = await Promise.all([
    executor.select({ id: appointments.id }).from(appointments).where(and(...doctorPredicates)).limit(1),
    executor.select({ id: appointments.id }).from(appointments).where(and(...patientPredicates)).limit(1),
  ]);
  if (doctorConflict.length) throw new ApiError(409, "SLOT_UNAVAILABLE", "This appointment slot is no longer available.");
  if (patientConflict.length) throw new ApiError(409, "PATIENT_TIME_CONFLICT", "You already have an active appointment at this time.");
  return slot;
}

export function createAppointmentService(database: Database, clock: () => Date = () => new Date()): AppointmentService {
  return {
    async book(patientId, input) {
      try {
        const id = await database.transaction(async (tx) => {
          const slot = await validateSlot(tx, patientId, input.doctorId, input.date, input.startTime, clock());
          const [created] = await tx.insert(appointments).values({ patientId, doctorId: input.doctorId, startAt: slot.startAt, endAt: slot.endAt, status: "PENDING" }).returning({ id: appointments.id });
          await tx.insert(appointmentEvents).values({ appointmentId: created!.id, eventType: "APPOINTMENT_CREATED", toStatus: "PENDING", actorProfileId: patientId, metadata: { startAt: slot.startAt.toISOString(), endAt: slot.endAt.toISOString() } });
          return created!.id;
        });
        return present(await loadAppointment(database, patientId, id), clock());
      } catch (error) { if (error instanceof ApiError) throw error; translateCollision(error); }
    },
    async list(patientId) {
      const rows = await database.select({ id: appointments.id, doctorId: appointments.doctorId, doctorName: profiles.fullName, specialization: doctors.specialization, consultationLocation: doctors.consultationLocation, startAt: appointments.startAt, endAt: appointments.endAt, status: appointments.status, createdAt: appointments.createdAt,noteId:visitNotes.id,noteContent:visitNotes.content,noteCreatedAt:visitNotes.createdAt })
        .from(appointments).innerJoin(doctors, eq(appointments.doctorId, doctors.id)).innerJoin(profiles, eq(doctors.profileId, profiles.id)).leftJoin(visitNotes,eq(visitNotes.appointmentId,appointments.id)).where(eq(appointments.patientId, patientId)).orderBy(desc(appointments.startAt));
      const now = clock(); return rows.map((row) => present(row, now));
    },
    async get(patientId, appointmentId) { return present(await loadAppointment(database, patientId, appointmentId), clock()); },
    async cancel(patientId, appointmentId) {
      const id = await database.transaction(async (tx) => {
        const current = await loadAppointment(tx, patientId, appointmentId, true);
        if (!MUTABLE_PATIENT_STATUSES.includes(current.status)) throw new ApiError(409, "APPOINTMENT_NOT_CANCELLABLE", "This appointment can no longer be cancelled.");
        assertBeforeCutoff(current.startAt, clock());
        await tx.update(appointments).set({ status: "CANCELLED", cancelledAt: clock(), cancellationReason: "Cancelled by patient" }).where(and(eq(appointments.id, appointmentId), eq(appointments.patientId, patientId)));
        await tx.insert(appointmentEvents).values({ appointmentId, eventType: "APPOINTMENT_CANCELLED", fromStatus: current.status, toStatus: "CANCELLED", actorProfileId: patientId, metadata: { startAt: current.startAt.toISOString() } });
        const [mail]=await tx.select({recipient:profiles.email,patientName:profiles.fullName,doctorName:doctorProfiles.fullName}).from(appointments).innerJoin(profiles,eq(appointments.patientId,profiles.id)).innerJoin(doctors,eq(appointments.doctorId,doctors.id)).innerJoin(doctorProfiles,eq(doctors.profileId,doctorProfiles.id)).where(eq(appointments.id,appointmentId)).limit(1);if(mail?.recipient)await enqueueAppointmentEmail(tx,{type:"APPOINTMENT_CANCELLATION_EMAIL",appointmentId,recipient:mail.recipient,patientName:mail.patientName,doctorName:mail.doctorName,startAt:current.startAt,reason:"Cancelled by patient",key:`patient-cancellation:${appointmentId}:${current.startAt.toISOString()}`});
        return appointmentId;
      });
      return present(await loadAppointment(database, patientId, id), clock());
    },
    async reschedule(patientId, appointmentId, input) {
      try {
        const id = await database.transaction(async (tx) => {
          const current = await loadAppointment(tx, patientId, appointmentId, true);
          if (!MUTABLE_PATIENT_STATUSES.includes(current.status)) throw new ApiError(409, "APPOINTMENT_NOT_RESCHEDULABLE", "This appointment can no longer be rescheduled.");
          const now = clock(); assertBeforeCutoff(current.startAt, now);
          const slot = await validateSlot(tx, patientId, current.doctorId, input.date, input.startTime, now, appointmentId);
          await tx.update(appointments).set({ startAt: slot.startAt, endAt: slot.endAt, status: "PENDING", confirmedAt: null, cancelledAt: null }).where(and(eq(appointments.id, appointmentId), eq(appointments.patientId, patientId)));
          await tx.insert(appointmentEvents).values({ appointmentId, eventType: "APPOINTMENT_RESCHEDULED", fromStatus: current.status, toStatus: "PENDING", actorProfileId: patientId, metadata: { oldStartAt: current.startAt.toISOString(), oldEndAt: current.endAt.toISOString(), newStartAt: slot.startAt.toISOString(), newEndAt: slot.endAt.toISOString() } });
          return appointmentId;
        });
        return present(await loadAppointment(database, patientId, id), clock());
      } catch (error) { if (error instanceof ApiError) throw error; translateCollision(error); }
    },
  };
}
