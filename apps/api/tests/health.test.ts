import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { ApiEnvironment } from "../src/config/env.js";

const testEnvironment: ApiEnvironment = {
  NODE_ENV: "test",
  PORT: 4000,
  WEB_ORIGIN: "http://localhost:5173",
  LOG_LEVEL: "silent",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value_long_enough",
};

const testDependencies = {
  tokenVerifier: { verify: async () => ({ userId: "00000000-0000-4000-8000-000000000001", email: null }) },
  profileRepository: { findById: async () => null },
};

describe("GET /api/v1/health", () => {
  it("returns the standard success envelope", async () => {
    const response = await request(createApp(testEnvironment, testDependencies)).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "ok", service: "nfc-api", version: "0.1.0" },
    });
    expect(response.body.data.timestamp).toEqual(expect.any(String));
  });

  it("returns the standard error envelope for unknown routes", async () => {
    const response = await request(createApp(testEnvironment, testDependencies)).get("/missing");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
    });
  });
});
