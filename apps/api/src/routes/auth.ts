import { patientProfileUpdateSchema } from "@nfc/contracts";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { ProfileRepository, TokenVerifier } from "../auth/types.js";
import { success } from "../http/responses.js";
import { createRequireAuth, requireAdmin, requireDoctor, requirePatient } from "../middleware/auth.js";
import { ApiError } from "../http/api-error.js";

export function createAuthRouter(tokenVerifier: TokenVerifier, profileRepository: ProfileRepository) {
  const router = Router();
  const requireAuth = createRequireAuth(tokenVerifier, profileRepository);
  const limiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false });

  router.use(limiter);
  router.get("/me", requireAuth, (request, response) => {
    response.json(success({
      user: { id: request.auth!.identity.userId, email: request.auth!.identity.email },
      profile: request.auth!.profile,
    }));
  });

  router.patch("/profile", requireAuth, requirePatient, async (request, response, next) => {
    try {
      const parsed = patientProfileUpdateSchema.safeParse(request.body);
      if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "Profile details are invalid.", parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })));
      if (!profileRepository.updatePatient) throw new ApiError(503, "INTERNAL_ERROR", "Profile updates are unavailable.");
      const profile = await profileRepository.updatePatient(request.auth!.profile.id, parsed.data);
      if (!profile) throw new ApiError(404, "NOT_FOUND", "Profile was not found.");
      response.json(success(profile));
    } catch (error) {
      next(error);
    }
  });

  // Minimal protected probes establish server-side role boundaries for portal APIs.
  router.get("/patient-access", requireAuth, requirePatient, (_request, response) => response.json(success({ allowed: true })));
  router.get("/doctor-access", requireAuth, requireDoctor, (_request, response) => response.json(success({ allowed: true })));
  router.get("/admin-access", requireAuth, requireAdmin, (_request, response) => response.json(success({ allowed: true })));
  return router;
}
