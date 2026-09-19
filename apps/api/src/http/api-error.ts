import type { ApiErrorCode, ApiErrorDetail } from "@nfc/contracts";

export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
