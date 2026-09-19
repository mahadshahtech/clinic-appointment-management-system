import { appointmentSlotInputSchema, rescheduleAppointmentInputSchema, uuidSchema } from "@nfc/contracts";
import { Router, type Request, type RequestHandler, type Response } from "express";
import type { ZodType } from "zod";
import type { ProfileRepository, TokenVerifier } from "../auth/types.js";
import type { AppointmentService } from "../appointments/types.js";
import { ApiError } from "../http/api-error.js";
import { success } from "../http/responses.js";
import { createRequireAuth, requirePatient } from "../middleware/auth.js";

function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, "VALIDATION_ERROR", "Request validation failed.", result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })));
  return result.data;
}
function asyncRoute(handler: (request: Request, response: Response) => Promise<unknown>): RequestHandler {
  return async (request, response, next) => { try { await handler(request, response); } catch (error) { next(error); } };
}

export function createPatientAppointmentRouter(tokenVerifier: TokenVerifier, profileRepository: ProfileRepository, service: AppointmentService) {
  const router = Router();
  router.use(createRequireAuth(tokenVerifier, profileRepository), requirePatient);
  router.get("/", asyncRoute(async (request, response) => response.json(success(await service.list(request.auth!.profile.id)))));
  router.post("/", asyncRoute(async (request, response) => response.status(201).json(success(await service.book(request.auth!.profile.id, parse(appointmentSlotInputSchema, request.body))))));
  router.get("/:appointmentId", asyncRoute(async (request, response) => response.json(success(await service.get(request.auth!.profile.id, parse(uuidSchema, request.params.appointmentId))))));
  router.post("/:appointmentId/cancel", asyncRoute(async (request, response) => response.json(success(await service.cancel(request.auth!.profile.id, parse(uuidSchema, request.params.appointmentId))))));
  router.post("/:appointmentId/reschedule", asyncRoute(async (request, response) => response.json(success(await service.reschedule(request.auth!.profile.id, parse(uuidSchema, request.params.appointmentId), parse(rescheduleAppointmentInputSchema, request.body))))));
  return router;
}
