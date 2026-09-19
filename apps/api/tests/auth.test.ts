import type { SafeProfile, UserRole } from "@nfc/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { TokenVerifier } from "../src/auth/types.js";
import type { ApiEnvironment } from "../src/config/env.js";
import { ApiError } from "../src/http/api-error.js";

const environment: ApiEnvironment = {
  NODE_ENV: "test", PORT: 4000, WEB_ORIGIN: "http://localhost:5173", LOG_LEVEL: "silent",
  SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value_long_enough",
};

function profile(role: UserRole): SafeProfile {
  return { id: "00000000-0000-4000-8000-000000000001", role, fullName: "Test User", phone: "+920000000", dateOfBirth: null, gender: null, isActive: true };
}

function appFor(role: UserRole, verifier?: TokenVerifier) {
  return createApp(environment, {
    tokenVerifier: verifier ?? { verify: async () => ({ userId: profile(role).id, email: "user@example.test" }) },
    profileRepository: { findById: async () => profile(role), updatePatient: async (_id, input) => ({ ...profile(role), ...input }) },
  });
}

describe("authentication and server-side roles", () => {
  it("returns 401 without a bearer token", async () => {
    expect((await request(appFor("PATIENT")).get("/api/v1/auth/me")).status).toBe(401);
  });

  it("returns 401 for an invalid or expired token", async () => {
    const app = appFor("PATIENT", { verify: async () => { throw new ApiError(401, "UNAUTHORIZED", "expired"); } });
    expect((await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer invalid")).status).toBe(401);
  });

  it("returns the safe authoritative profile from /auth/me", async () => {
    const response = await request(appFor("PATIENT")).get("/api/v1/auth/me").set("Authorization", "Bearer valid");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      user: { id: profile("PATIENT").id, email: "user@example.test" },
      profile: profile("PATIENT"),
    });
    expect(response.body.data.profile).not.toHaveProperty("password");
  });

  it.each([
    ["PATIENT", "/api/v1/auth/doctor-access"],
    ["DOCTOR", "/api/v1/auth/admin-access"],
    ["ADMIN", "/api/v1/auth/patient-access"],
  ] as const)("forbids %s from the wrong role endpoint", async (role, path) => {
    expect((await request(appFor(role)).get(path).set("Authorization", "Bearer valid")).status).toBe(403);
  });

  it("denies a missing application profile", async () => {
    const app = createApp(environment, {
      tokenVerifier: { verify: async () => ({ userId: profile("PATIENT").id, email: null }) },
      profileRepository: { findById: async () => null },
    });
    expect((await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer valid")).status).toBe(403);
  });

  it("lets a patient update only supported application profile fields", async () => {
    const response = await request(appFor("PATIENT")).patch("/api/v1/auth/profile").set("Authorization", "Bearer valid").send({ fullName: "Updated Patient", phone: "+92-300-1111111", dateOfBirth: "1995-06-12", gender: "Female" });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ fullName: "Updated Patient", phone: "+92-300-1111111", dateOfBirth: "1995-06-12", gender: "Female", role: "PATIENT" });
  });

  it("does not let Doctor or Admin roles use the Patient profile editor", async () => {
    for (const role of ["DOCTOR", "ADMIN"] as const) {
      const response = await request(appFor(role)).patch("/api/v1/auth/profile").set("Authorization", "Bearer valid").send({ fullName: "Blocked", phone: "+92-300-1111111", dateOfBirth: null, gender: null });
      expect(response.status).toBe(403);
    }
  });
});
