import type { AuthenticatedRequestState } from "../auth/types.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequestState;
    }
  }
}

export {};
