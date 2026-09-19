import { describe, expect, it } from "vitest";

import { healthStatusSchema } from "./api.js";

describe("healthStatusSchema", () => {
  it("accepts the public health response", () => {
    expect(
      healthStatusSchema.parse({
        status: "ok",
        service: "nfc-api",
        version: "0.1.0",
        timestamp: new Date().toISOString(),
      }),
    ).toBeDefined();
  });
});
