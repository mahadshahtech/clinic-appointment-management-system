import type { ErrorRequestHandler, RequestHandler } from "express";

import { ApiError } from "../http/api-error.js";
import { failure } from "../http/responses.js";
import { safeOperationalError } from "../http/safe-error.js";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new ApiError(404, "NOT_FOUND", `Route ${request.method} ${request.path} was not found.`));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.status).json(
      failure({
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId: String(request.id),
      }),
    );
    return;
  }

  request.log.error({ error: safeOperationalError(error) }, "Unhandled request error");
  response.status(500).json(
    failure({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      requestId: String(request.id),
    }),
  );
};
