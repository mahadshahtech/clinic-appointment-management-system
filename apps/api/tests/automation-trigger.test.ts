import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { HTTP_REDACT_PATHS, createApp } from "../src/app.js";
import { loadAutomationEnvironment } from "../src/automation/config.js";
import { runAutomationCycle } from "../src/automation/cycle.js";
import type { ApiEnvironment } from "../src/config/env.js";

const environment: ApiEnvironment = {
  NODE_ENV: "test",
  PORT: 4000,
  WEB_ORIGIN: "http://localhost:5173",
  LOG_LEVEL: "silent",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value_long_enough",
};
const triggerSecret = "test-automation-trigger-secret-value-123456";

function app(runCycle = vi.fn(async () => ({ expired: 1, reminders: 2, delivered: 3 }))) {
  return {
    runCycle,
    application: createApp(environment, {
      tokenVerifier: { verify: async () => ({ userId: "unused", email: null }) },
      profileRepository: { findById: async () => null },
      automation: { triggerSecret, runCycle },
    }),
  };
}

describe("automation cycle", () => {
  it("runs expiry, reminder generation, and outbox delivery once in order", async () => {
    const calls: string[] = [];
    const result = await runAutomationCycle({
      expireDue: async () => { calls.push("expire"); return 1; },
      generateReminders: async () => { calls.push("reminders"); return 2; },
      processOutbox: async () => { calls.push("outbox"); return 3; },
    });
    expect(calls).toEqual(["expire", "reminders", "outbox"]);
    expect(result).toEqual({ expired: 1, reminders: 2, delivered: 3 });
  });

  it("stops and rejects when a stage fails", async () => {
    const reminders = vi.fn();
    await expect(runAutomationCycle({
      expireDue: async () => { throw new Error("database unavailable"); },
      generateReminders: reminders,
      processOutbox: vi.fn(),
    })).rejects.toThrow("database unavailable");
    expect(reminders).not.toHaveBeenCalled();
  });
});

describe("internal automation trigger route", () => {
  it("is mounted at the assembled application path and runs with the dedicated secret", async () => {
    const { application, runCycle } = app();
    const response = await request(application)
      .post("/api/v1/internal/automation/run")
      .set("x-nfc-automation-secret", triggerSecret);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { expired: 1, reminders: 2, delivered: 3 } });
    expect(runCycle).toHaveBeenCalledOnce();
  });

  it.each([undefined, "wrong-automation-trigger-secret-value-123456"])("returns 401 for a missing or invalid secret", async (secret) => {
    const { application, runCycle } = app();
    const pending = request(application).post("/api/v1/internal/automation/run");
    const response = await (secret ? pending.set("x-nfc-automation-secret", secret) : pending);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
    expect(runCycle).not.toHaveBeenCalled();
  });

  it("returns a sanitized 500 when the cycle fails", async () => {
    const sensitive = "test-automation-trigger-secret-value-123456";
    const { application } = app(vi.fn(async () => { throw new Error(`failure containing ${sensitive}`); }));
    const response = await request(application)
      .post("/api/v1/internal/automation/run")
      .set("x-nfc-automation-secret", triggerSecret);
    expect(response.status).toBe(500);
    expect(response.body.error).toMatchObject({ code: "INTERNAL_ERROR", message: "An unexpected error occurred." });
    expect(JSON.stringify(response.body)).not.toContain(sensitive);
  });

  it("fails closed when the endpoint dependency is not configured", async () => {
    const application = createApp(environment, {
      tokenVerifier: { verify: async () => ({ userId: "unused", email: null }) },
      profileRepository: { findById: async () => null },
    });
    expect((await request(application).post("/api/v1/internal/automation/run")).status).toBe(404);
  });

  it("redacts the trigger credential from HTTP logs", () => {
    expect(HTTP_REDACT_PATHS).toContain("req.headers.x-nfc-automation-secret");
  });
});

describe("automation environment", () => {
  it("validates a dedicated trigger secret and keeps the outbound webhook secret separate", () => {
    const result = loadAutomationEnvironment({
      EMAIL_DELIVERY_MODE: "n8n",
      N8N_EMAIL_WEBHOOK_URL: "https://n8n.example.test/webhook/email",
      N8N_WEBHOOK_SECRET: "outbound-webhook-secret",
      AUTOMATION_TRIGGER_SECRET: triggerSecret,
    });
    expect(result.AUTOMATION_TRIGGER_SECRET).toBe(triggerSecret);
    expect(result.N8N_WEBHOOK_SECRET).toBe("outbound-webhook-secret");
  });

  it("rejects short trigger credentials", () => {
    expect(() => loadAutomationEnvironment({ AUTOMATION_TRIGGER_SECRET: "too-short" })).toThrow();
  });

  it("treats empty optional environment placeholders as unset", () => {
    const result = loadAutomationEnvironment({
      N8N_EMAIL_WEBHOOK_URL: "",
      N8N_WEBHOOK_SECRET: "",
      AUTOMATION_TRIGGER_SECRET: "",
    });
    expect(result.N8N_EMAIL_WEBHOOK_URL).toBeUndefined();
    expect(result.N8N_WEBHOOK_SECRET).toBeUndefined();
    expect(result.AUTOMATION_TRIGGER_SECRET).toBeUndefined();
  });
});
