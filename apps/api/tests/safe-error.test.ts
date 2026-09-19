import { describe, expect, it } from "vitest";

import { safeOperationalError } from "../src/http/safe-error.js";

describe("safe operational error logging", () => {
  it("does not serialize messages, SQL parameters, email addresses, or secrets", () => {
    const result = safeOperationalError({
      name: "PostgresError",
      message: "failed query params: patient@example.test secret-value",
      code: "XX000",
      cause: {
        code: "23505",
        message: "duplicate patient@example.test",
        table_name: "automation_events",
        column_name: "idempotency_key",
      },
    });

    expect(result).toEqual({
      name: "PostgresError",
      code: "XX000",
      causeCode: "23505",
      table: "automation_events",
      column: "idempotency_key",
    });
    expect(JSON.stringify(result)).not.toContain("patient@example.test");
    expect(JSON.stringify(result)).not.toContain("secret-value");
    expect(JSON.stringify(result)).not.toContain("failed query");
  });
});
