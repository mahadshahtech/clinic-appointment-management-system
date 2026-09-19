import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ loading: false, role: null as "PATIENT" | "DOCTOR" | "ADMIN" | null, session: null as object | null, profile: null as { role: "PATIENT" | "DOCTOR" | "ADMIN" } | null }));
vi.mock("./auth-provider", () => ({ useAuth: () => authState }));

import { ProtectedRoute, PublicLandingRoute, PublicOnlyRoute } from "./route-guards";

function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}</output>; }
function renderRoutes(initialPath: string) {
  return render(<MemoryRouter initialEntries={[initialPath]}><Location /><Routes>
    <Route element={<PublicLandingRoute />}><Route path="/" element={<div>Public landing</div>} /></Route>
    <Route element={<PublicOnlyRoute />}><Route element={<Outlet />}><Route path="/login" element={<div>Login page</div>} /><Route path="/signup" element={<div>Signup page</div>} /></Route></Route>
    <Route element={<ProtectedRoute role="PATIENT" />}><Route path="/patient" element={<div>Patient portal</div>} /></Route>
    <Route element={<ProtectedRoute role="DOCTOR" />}><Route path="/doctor" element={<div>Doctor portal</div>} /></Route>
    <Route path="/admin" element={<div>Admin portal</div>} />
  </Routes></MemoryRouter>);
}

describe("role-aware route guards", () => {
  beforeEach(() => { authState.loading = false; authState.role = null; authState.session = null; authState.profile = null; });
  afterEach(() => cleanup());

  it("routes a confirmed patient returning at root to /patient", async () => {
    authState.role = "PATIENT"; authState.session = {}; authState.profile = { role: "PATIENT" };
    renderRoutes("/");
    expect(await screen.findByText("Patient portal")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/patient");
  });

  it("redirects an already-authenticated patient away from the public root", async () => {
    authState.role = "PATIENT"; authState.session = {}; authState.profile = { role: "PATIENT" };
    renderRoutes("/");
    expect(await screen.findByText("Patient portal")).toBeInTheDocument();
  });

  it("does not redirect or render public content while auth is loading", () => {
    authState.loading = true;
    renderRoutes("/");
    expect(screen.getByText(/preparing your secure clinic space/i)).toBeInTheDocument();
    expect(screen.queryByText("Public landing")).not.toBeInTheDocument();
  });

  it.each([["/", "Public landing"], ["/login", "Login page"], ["/signup", "Signup page"]])("allows an unauthenticated visitor to access %s", (path, content) => {
    renderRoutes(path);
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it("blocks a patient from a doctor route and sends them to their own portal", async () => {
    authState.role = "PATIENT"; authState.session = {}; authState.profile = { role: "PATIENT" };
    renderRoutes("/doctor");
    expect(await screen.findByText("Patient portal")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/patient");
  });
});
