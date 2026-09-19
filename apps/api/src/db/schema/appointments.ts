import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "./common.js";
import { doctors } from "./doctors.js";
import { appointmentStatusEnum } from "./enums.js";
import { profiles } from "./profiles.js";

const reservingStatus = sql`status in ('PENDING'::appointment_status, 'CONFIRMED'::appointment_status)`;

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull(),
    doctorId: uuid("doctor_id").notNull(),
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
    status: appointmentStatusEnum("status").notNull().default("PENDING"),
    cancellationReason: text("cancellation_reason"),
    rejectionReason: text("rejection_reason"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    createdAt,
    updatedAt,
  },
  (table) => [
    foreignKey({ columns: [table.patientId], foreignColumns: [profiles.id], name: "appointments_patient_id_profiles_id_fk" })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({ columns: [table.doctorId], foreignColumns: [doctors.id], name: "appointments_doctor_id_doctors_id_fk" })
      .onDelete("restrict")
      .onUpdate("cascade"),
    check("appointments_exactly_thirty_minutes", sql`${table.endAt} = ${table.startAt} + interval '30 minutes'`),
    unique("appointments_identity_parties_unique").on(table.id, table.doctorId, table.patientId),
    uniqueIndex("appointments_doctor_reserving_slot_unique").on(table.doctorId, table.startAt).where(reservingStatus),
    uniqueIndex("appointments_patient_reserving_slot_unique").on(table.patientId, table.startAt).where(reservingStatus),
    index("appointments_doctor_start_idx").on(table.doctorId, table.startAt),
    index("appointments_patient_start_idx").on(table.patientId, table.startAt),
    index("appointments_status_start_idx").on(table.status, table.startAt),
    index("appointments_doctor_status_start_idx").on(table.doctorId, table.status, table.startAt),
  ],
);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
