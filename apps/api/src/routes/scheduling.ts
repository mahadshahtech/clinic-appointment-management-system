import { availabilityQuerySchema, doctorDirectoryQuerySchema, leaveInputSchema, uuidSchema, workingHourInputSchema } from "@nfc/contracts";
import { Router, type Request, type RequestHandler, type Response } from "express";
import type { ZodType } from "zod";

import type { ProfileRepository, TokenVerifier } from "../auth/types.js";
import { ApiError } from "../http/api-error.js";
import { success } from "../http/responses.js";
import { createRequireAuth, requireDoctor, requirePatient } from "../middleware/auth.js";
import type { SchedulingService } from "../scheduling/types.js";

function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, "VALIDATION_ERROR", "Request validation failed.", result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })));
  return result.data;
}

function asyncRoute(handler: (request: Request, response: Response) => Promise<unknown>): RequestHandler {
  return async (request, response, next) => {
    try { await handler(request, response); } catch (error) { next(error); }
  };
}

export function createSchedulingRouters(tokenVerifier: TokenVerifier, profileRepository: ProfileRepository, service: SchedulingService) {
  const patient = Router(); const doctor = Router();
  const requireAuth = createRequireAuth(tokenVerifier, profileRepository);

  patient.use(requireAuth, requirePatient);
  patient.get("/", asyncRoute(async (request, response) => response.json(success(await service.listDoctors(parse(doctorDirectoryQuerySchema, request.query))))));
  patient.get("/:doctorId/availability", asyncRoute(async (request, response) => {
    const doctorId = parse(uuidSchema, request.params.doctorId); const { date } = parse(availabilityQuerySchema, request.query);
    response.json(success(await service.getAvailability(doctorId, date)));
  }));
  patient.get("/:doctorId", asyncRoute(async (request, response) => response.json(success(await service.getDoctor(parse(uuidSchema, request.params.doctorId))))));

  doctor.use(requireAuth, requireDoctor);
  doctor.get("/schedule", asyncRoute(async (request, response) => response.json(success(await service.listOwnSchedule(request.auth!.profile.id)))));
  doctor.post("/schedule", asyncRoute(async (request, response) => response.status(201).json(success(await service.createOwnSchedule(request.auth!.profile.id, parse(workingHourInputSchema, request.body))))));
  doctor.patch("/schedule/:id", asyncRoute(async (request, response) => response.json(success(await service.updateOwnSchedule(request.auth!.profile.id, parse(uuidSchema, request.params.id), parse(workingHourInputSchema, request.body))))));
  doctor.delete("/schedule/:id", asyncRoute(async (request, response) => { await service.deleteOwnSchedule(request.auth!.profile.id, parse(uuidSchema, request.params.id)); response.status(204).send(); }));
  doctor.get("/leave", asyncRoute(async (request, response) => response.json(success(await service.listOwnLeave(request.auth!.profile.id)))));
  doctor.post("/leave", asyncRoute(async (request, response) => response.status(201).json(success(await service.createOwnLeave(request.auth!.profile.id, parse(leaveInputSchema, request.body))))));
  doctor.delete("/leave/:id", asyncRoute(async (request, response) => { await service.deleteOwnLeave(request.auth!.profile.id, parse(uuidSchema, request.params.id)); response.status(204).send(); }));
  return { patient, doctor };
}
