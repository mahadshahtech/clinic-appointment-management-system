import type { SafeProfile } from "@nfc/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { ApiEnvironment } from "../src/config/env.js";

const environment: ApiEnvironment = {
  NODE_ENV: "test", PORT: 4000, WEB_ORIGIN: "http://localhost:5173", LOG_LEVEL: "silent",
  SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value_long_enough",
};
const profile: SafeProfile = {
  id: "00000000-0000-4000-8000-000000000001", role: "PATIENT", fullName: "Route Test",
  phone: "+920000000", dateOfBirth: null, gender: null, isActive: true,
};
const app = createApp(environment, {
  tokenVerifier: { verify: async () => ({ userId: profile.id, email: "route@example.test" }) },
  profileRepository: { findById: async () => profile },
});

describe("assembled Express route mounting", () => {
  it("mounts health at /api/v1/health", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
  });

  it("mounts auth/me at /api/v1/auth/me and returns 401 rather than 404 without a token", async () => {
    const response = await request(app).get("/api/v1/auth/me");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns the database-backed safe profile at the mounted auth/me route", async () => {
    const response = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer valid-token");
    expect(response.status).toBe(200);
    expect(response.body.data.profile).toEqual(profile);
  });
});
