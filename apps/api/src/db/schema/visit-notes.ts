import { foreignKey, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { appointments } from "./appointments.js";
import { doctors } from "./doctors.js";
import { profiles } from "./profiles.js";

export const visitNotes = pgTable(
  "visit_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id").notNull(),
    doctorId: uuid("doctor_id").notNull(),
    patientId: uuid("patient_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique("visit_notes_appointment_id_unique").on(table.appointmentId),
    foreignKey({
      columns: [table.appointmentId, table.doctorId, table.patientId],
      foreignColumns: [appointments.id, appointments.doctorId, appointments.patientId],
      name: "visit_notes_appointment_parties_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({ columns: [table.doctorId], foreignColumns: [doctors.id], name: "visit_notes_doctor_id_doctors_id_fk" })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({ columns: [table.patientId], foreignColumns: [profiles.id], name: "visit_notes_patient_id_profiles_id_fk" })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export type VisitNote = typeof visitNotes.$inferSelect;
export type NewVisitNote = typeof visitNotes.$inferInsert;
