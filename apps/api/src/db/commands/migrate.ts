import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { loadDatabaseEnvironment } from "../../config/database-env.js";
import { createDatabase } from "../client.js";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
const environment = loadDatabaseEnvironment();
const connection = createDatabase(
  { DATABASE_URL: environment.DATABASE_MIGRATION_URL ?? environment.DATABASE_URL },
  { max: 1 },
);

try {
  await migrate(connection.db, { migrationsFolder });
  console.info("Database migrations completed successfully.");
} finally {
  await connection.close();
}
