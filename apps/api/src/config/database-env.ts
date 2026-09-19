import "dotenv/config";

import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url().refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
    message: "must be a PostgreSQL connection URL",
  }),
  DATABASE_MIGRATION_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
      message: "must be a PostgreSQL connection URL",
    })
    .optional(),
});

export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>;

export function loadDatabaseEnvironment(source: NodeJS.ProcessEnv = process.env): DatabaseEnvironment {
  const result = databaseEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid database environment: ${issues}`);
  }

  return result.data;
}
