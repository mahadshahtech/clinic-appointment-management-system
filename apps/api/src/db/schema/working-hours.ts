import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, pgTable, unique, uuid } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "./common.js";
import { doctors } from "./doctors.js";

export const doctorWorkingHours = pgTable(
  "doctor_working_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id").notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    foreignKey({ columns: [table.doctorId], foreignColumns: [doctors.id], name: "working_hours_doctor_id_doctors_id_fk" })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("working_hours_exact_range_unique").on(table.doctorId, table.dayOfWeek, table.startMinute, table.endMinute),
    check("working_hours_weekday_valid", sql`${table.dayOfWeek} between 0 and 6`),
    check("working_hours_start_minute_valid", sql`${table.startMinute} between 0 and 1439`),
    check("working_hours_end_minute_valid", sql`${table.endMinute} between 1 and 1440`),
    check("working_hours_range_ordered", sql`${table.startMinute} < ${table.endMinute}`),
    check("working_hours_half_hour_aligned", sql`${table.startMinute} % 30 = 0 and ${table.endMinute} % 30 = 0`),
    index("working_hours_doctor_weekday_idx").on(table.doctorId, table.dayOfWeek),
  ],
);

export type DoctorWorkingHours = typeof doctorWorkingHours.$inferSelect;
export type NewDoctorWorkingHours = typeof doctorWorkingHours.$inferInsert;
