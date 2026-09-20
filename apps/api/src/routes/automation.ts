import { createHash, timingSafeEqual } from "node:crypto";
import { Router, type RequestHandler } from "express";

import type { AutomationCycleResult } from "../automation/cycle.js";
import { ApiError } from "../http/api-error.js";
import { success } from "../http/responses.js";

export type AutomationCycleRunner = () => Promise<AutomationCycleResult>;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function validAutomationSecret(candidate: unknown, expected: string): boolean {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  return timingSafeEqual(digest(candidate), digest(expected));
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

export function createAutomationRouter(triggerSecret: string, runCycle: AutomationCycleRunner) {
  const router = Router();
  router.post(
    "/run",
    asyncRoute(async (request, response) => {
      if (!validAutomationSecret(request.get("x-nfc-automation-secret"), triggerSecret)) {
        throw new ApiError(401, "UNAUTHORIZED", "Automation trigger authentication failed.");
      }
      response.json(success(await runCycle()));
    }),
  );
  return router;
}
