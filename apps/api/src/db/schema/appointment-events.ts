import { jsonb, pgTable, text, timestamp, uuid, foreignKey, index } from "drizzle-orm/pg-core";

import { appointments } from "./appointments.js";
import { appointmentStatusEnum } from "./enums.js";
import { profiles } from "./profiles.js";

export const appointmentEvents = pgTable(
  "appointment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id").notNull(),
    eventType: text("event_type").notNull(),
    fromStatus: appointmentStatusEnum("from_status"),
    toStatus: appointmentStatusEnum("to_status"),
    actorProfileId: uuid("actor_profile_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.appointmentId], foreignColumns: [appointments.id], name: "appointment_events_appointment_id_appointments_id_fk" })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({ columns: [table.actorProfileId], foreignColumns: [profiles.id], name: "appointment_events_actor_profile_id_profiles_id_fk" })
      .onDelete("set null")
      .onUpdate("cascade"),
    index("appointment_events_appointment_created_idx").on(table.appointmentId, table.createdAt),
  ],
);

export type AppointmentEvent = typeof appointmentEvents.$inferSelect;
export type NewAppointmentEvent = typeof appointmentEvents.$inferInsert;
