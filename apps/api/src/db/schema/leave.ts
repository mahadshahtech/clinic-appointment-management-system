import { foreignKey, index, pgTable, text, unique, uuid, date, timestamp } from "drizzle-orm/pg-core";

import { doctors } from "./doctors.js";

export const doctorLeave = pgTable(
  "doctor_leave",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id").notNull(),
    leaveDate: date("leave_date", { mode: "string" }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.doctorId], foreignColumns: [doctors.id], name: "doctor_leave_doctor_id_doctors_id_fk" })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("doctor_leave_doctor_date_unique").on(table.doctorId, table.leaveDate),
    index("doctor_leave_date_idx").on(table.leaveDate),
  ],
);

export type DoctorLeave = typeof doctorLeave.$inferSelect;
export type NewDoctorLeave = typeof doctorLeave.$inferInsert;
