import { Router } from "express";
import type { HealthStatus } from "@nfc/contracts";

import { success } from "../http/responses.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  const health: HealthStatus = {
    status: "ok",
    service: "nfc-api",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  };

  response.status(200).json(success(health));
});
