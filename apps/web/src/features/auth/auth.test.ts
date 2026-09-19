import { matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { appRoutes } from "../../app/router";
import { authReducer, initialAuthState } from "./auth-reducer";
import { canAccessPortal, getRoleHome } from "./routes";
import { buildPatientSignupOptions } from "./signup";

describe("frontend auth boundaries", () => {
  it("never forwards a client-supplied doctor or admin role during signup", () => {
    const base = { fullName: "Patient", phone: "+920000000", email: "p@example.test", password: "password1", confirmPassword: "password1" };
    for (const role of ["DOCTOR", "ADMIN"]) {
      const options = buildPatientSignupOptions({ ...base, role } as never);
      expect(options.options.data).toEqual({ full_name: "Patient", phone: "+920000000" });
      expect(options.options.data).not.toHaveProperty("role");
    }
  });

  it("uses the authoritative profile role for destinations, not localStorage", () => {
    localStorage.setItem("role", "ADMIN");
    expect(getRoleHome("PATIENT")).toBe("/patient");
    expect(canAccessPortal("PATIENT", "/admin")).toBe(false);
  });

  it.each([["PATIENT", "/patient"], ["DOCTOR", "/doctor"], ["ADMIN", "/admin"]] as const)("routes a logged-in %s to %s", (role, expected) => {
    expect(getRoleHome(role)).toBe(expected);
  });

  it("clears session, user, and profile on logout", () => {
    const cleared = authReducer({ ...initialAuthState, loading: false, error: "old" }, { type: "SIGNED_OUT" });
    expect(cleared).toEqual({ session: null, user: null, profile: null, loading: false, error: null });
  });

  it.each(["/patient", "/patient/doctors/abc", "/doctor", "/admin"])("matches direct SPA route %s", (path) => {
    expect(matchRoutes(appRoutes, path)).not.toBeNull();
  });
});
