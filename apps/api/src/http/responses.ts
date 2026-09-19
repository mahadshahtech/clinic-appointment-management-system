import type { ApiFailure, ApiSuccess } from "@nfc/contracts";

export function success<T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return meta === undefined ? { success: true, data } : { success: true, data, meta };
}

export function failure(error: ApiFailure["error"]): ApiFailure {
  return { success: false, error };
}
