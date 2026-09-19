import { defineConfig } from "drizzle-kit";

import { loadDatabaseEnvironment } from "./src/config/database-env.js";

const environment = loadDatabaseEnvironment();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: environment.DATABASE_MIGRATION_URL ?? environment.DATABASE_URL,
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },
  strict: true,
  verbose: true,
});
