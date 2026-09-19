type ErrorShape = {
  name?: unknown;
  code?: unknown;
  cause?: { code?: unknown; table_name?: unknown; column_name?: unknown };
};

/** Operational error metadata that is safe to log without serializing messages, SQL parameters, or payloads. */
export function safeOperationalError(error: unknown) {
  const value = (typeof error === "object" && error ? error : {}) as ErrorShape;
  return {
    name: typeof value.name === "string" ? value.name : "UnknownError",
    code: typeof value.code === "string" ? value.code : undefined,
    causeCode: typeof value.cause?.code === "string" ? value.cause.code : undefined,
    table: typeof value.cause?.table_name === "string" ? value.cause.table_name : undefined,
    column: typeof value.cause?.column_name === "string" ? value.cause.column_name : undefined,
  };
}
