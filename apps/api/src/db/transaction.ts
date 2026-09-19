import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import type { Database } from "./client.js";
import * as schema from "./schema/index.js";

export type DatabaseTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export function withTransaction<T>(database: Database, operation: (transaction: DatabaseTransaction) => Promise<T>): Promise<T> {
  return database.transaction(operation);
}
