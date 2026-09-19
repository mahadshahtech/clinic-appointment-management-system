import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { DatabaseEnvironment } from "../config/database-env.js";
import * as schema from "./schema/index.js";

export function createDatabase(environment: DatabaseEnvironment, options: { max?: number } = {}) {
  const hostname = new URL(environment.DATABASE_URL).hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const client = postgres(environment.DATABASE_URL, {
    max: options.max ?? 10,
    prepare: false,
    ssl: isLocal ? false : "require",
    onnotice: () => undefined,
  });

  return {
    db: drizzle(client, { schema }),
    client,
    async close() {
      await client.end();
    },
  };
}

export type DatabaseConnection = ReturnType<typeof createDatabase>;
export type Database = DatabaseConnection["db"];
