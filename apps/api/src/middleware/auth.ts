import type { UserRole } from "@nfc/contracts";
import type { RequestHandler } from "express";

import type { ProfileRepository, TokenVerifier } from "../auth/types.js";
import { ApiError } from "../http/api-error.js";

export function createRequireAuth(tokenVerifier: TokenVerifier, profileRepository: ProfileRepository): RequestHandler {
  return async (request, _response, next) => {
    try {
      const authorization = request.header("authorization");
      const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
      if (!match?.[1]) throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");

      const identity = await tokenVerifier.verify(match[1]);
      const profile = await profileRepository.findById(identity.userId);
      if (!profile || !profile.isActive) {
        throw new ApiError(403, "PROFILE_UNAVAILABLE", "Your clinic profile is unavailable or disabled.");
      }

      request.auth = { identity, profile };
      next();
    } catch (error) {
      next(error instanceof ApiError ? error : new ApiError(401, "UNAUTHORIZED", "Your session is invalid or has expired."));
    }
  };
}

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) return next(new ApiError(401, "UNAUTHORIZED", "Authentication is required."));
    if (!allowedRoles.includes(request.auth.profile.role)) {
      return next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action."));
    }
    next();
  };
}

export const requirePatient = requireRole("PATIENT");
export const requireDoctor = requireRole("DOCTOR");
export const requireAdmin = requireRole("ADMIN");
