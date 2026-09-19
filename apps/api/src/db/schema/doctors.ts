import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, pgTable, text, unique, uuid, varchar } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "./common.js";
import { profiles } from "./profiles.js";

export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").notNull(),
    specialization: varchar("specialization", { length: 160 }).notNull(),
    qualifications: text("qualifications").notNull(),
    bio: text("bio").notNull(),
    experienceYears: integer("experience_years").notNull().default(0),
    consultationLocation: varchar("consultation_location", { length: 240 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("doctors_profile_id_unique").on(table.profileId),
    foreignKey({ columns: [table.profileId], foreignColumns: [profiles.id], name: "doctors_profile_id_profiles_id_fk" })
      .onDelete("restrict")
      .onUpdate("cascade"),
    check("doctors_experience_years_nonnegative", sql`${table.experienceYears} >= 0`),
    check("doctors_specialization_not_blank", sql`length(trim(${table.specialization})) > 0`),
    index("doctors_active_idx").on(table.isActive),
  ],
);

export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
