import { describe, expect, it } from "vitest";
import { buildApiUrl } from "./api";

describe("API URL composition", () => {
  it("constructs the auth profile endpoint with exactly one API prefix", () => {
    expect(buildApiUrl("http://localhost:4000/api/v1", "auth/me")).toBe("http://localhost:4000/api/v1/auth/me");
    expect(buildApiUrl("http://localhost:4000/api/v1/", "/auth/me")).toBe("http://localhost:4000/api/v1/auth/me");
  });
});
