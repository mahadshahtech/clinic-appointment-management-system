import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL("../../src/db/migrations/0000_unknown_shen.sql", import.meta.url));

describe("initial migration SQL", () => {
  it("contains the PostgreSQL-only concurrency and privacy protections", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS "btree_gist"');
    expect(migration).toContain('CONSTRAINT "working_hours_no_overlap"');
    expect(migration).toContain('EXCLUDE USING gist');
    expect(migration).toContain('CREATE UNIQUE INDEX "appointments_doctor_reserving_slot_unique"');
    expect(migration).toContain('CREATE UNIQUE INDEX "appointments_patient_reserving_slot_unique"');
    expect(migration).toContain('WHERE status in (\'PENDING\'::appointment_status, \'CONFIRMED\'::appointment_status)');
    expect(migration).toContain('CONSTRAINT "automation_events_idempotency_key_unique"');
    expect(migration).toContain('CREATE TRIGGER "appointment_events_immutable"');
    for (const table of ["profiles","doctors","doctor_working_hours","doctor_leave","appointments","appointment_events","visit_notes","automation_events"]) {
      expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    }
    const adminAuditPath = fileURLToPath(new URL("../../src/db/migrations/0003_admin_doctor_audit.sql", import.meta.url));
    expect(await readFile(adminAuditPath,"utf8")).toContain('ALTER TABLE "admin_doctor_events" ENABLE ROW LEVEL SECURITY');
  });

  it("hardcodes public Auth provisioning to the patient role", async () => {
    const authMigrationPath = fileURLToPath(new URL("../../src/db/migrations/0001_auth_profile_sync.sql", import.meta.url));
    const migration = await readFile(authMigrationPath, "utf8");
    expect(migration).toContain("'PATIENT'::public.user_role");
    expect(migration).not.toMatch(/raw_(user|app)_meta_data\s*->>\s*'role'/);
    expect(migration).toContain('AFTER INSERT ON "auth"."users"');
  });
});
