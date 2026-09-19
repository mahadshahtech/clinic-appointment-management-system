import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { automationEventStatusEnum } from "./enums.js";

export const automationEvents = pgTable(
  "automation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    recipient: text("recipient").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    idempotencyKey: text("idempotency_key").notNull(),
    status: automationEventStatusEnum("status").notNull().default("PENDING"),
    availableAt: timestamp("available_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    attemptCount: integer("attempt_count").notNull().default(0),
    lockedAt: timestamp("locked_at", { withTimezone: true, mode: "date" }),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique("automation_events_idempotency_key_unique").on(table.idempotencyKey),
    check("automation_events_attempt_count_nonnegative", sql`${table.attemptCount} >= 0`),
    index("automation_events_claim_idx").on(table.status, table.availableAt),
    index("automation_events_aggregate_idx").on(table.aggregateType, table.aggregateId),
  ],
);

export type AutomationEvent = typeof automationEvents.$inferSelect;
export type NewAutomationEvent = typeof automationEvents.$inferInsert;
