import { sql } from "drizzle-orm";
import { boolean, check, date, index, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "./common.js";
import { userRoleEnum } from "./enums.js";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    role: userRoleEnum("role").notNull(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    email: varchar("email",{length:320}),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    gender: varchar("gender", { length: 40 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    check("profiles_full_name_not_blank", sql`length(trim(${table.fullName})) > 0`),
    check("profiles_phone_not_blank", sql`length(trim(${table.phone})) > 0`),
    index("profiles_role_active_idx").on(table.role, table.isActive),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
