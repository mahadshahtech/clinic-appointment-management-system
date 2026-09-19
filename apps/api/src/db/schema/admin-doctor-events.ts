import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./common.js";
import { doctors } from "./doctors.js";
import { profiles } from "./profiles.js";

export const adminDoctorEvents = pgTable("admin_doctor_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "restrict", onUpdate: "cascade" }),
  actorProfileId: uuid("actor_profile_id").notNull().references(() => profiles.id, { onDelete: "restrict", onUpdate: "cascade" }),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt,
}, (table) => [index("admin_doctor_events_doctor_created_idx").on(table.doctorId, table.createdAt)]);
