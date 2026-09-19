import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ signIn: vi.fn(), profile: null as null | { role: "PATIENT" | "DOCTOR" | "ADMIN" } }));
vi.mock("../features/auth/auth-provider", () => ({ useAuth: () => auth }));
import { LoginPage } from "./login-page";
import { RoleMismatchPage } from "./role-mismatch-page";

function renderLogin(path = "/login") {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/auth/portal-mismatch" element={<RoleMismatchPage />} />
    <Route path="/patient" element={<div>Patient destination</div>} />
    <Route path="/doctor" element={<div>Doctor destination</div>} />
    <Route path="/admin" element={<div>Admin destination</div>} />
  </Routes></MemoryRouter>);
}
async function submit(email = "person@example.test") {
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123!" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in to/i }));
}

describe("role-aware LoginPage", () => {
  afterEach(() => { cleanup(); auth.signIn.mockReset(); auth.profile = null; });

  it("defaults to the Patient experience and offers Patient signup", () => {
    renderLogin();
    expect(screen.getAllByText("Patient Portal").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Create patient account" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("tab", { name: /patient/i })).toHaveAttribute("aria-selected", "true");
  });

  it("shows Doctor context without public signup", () => {
    renderLogin("/login?portal=doctor");
    expect(screen.getAllByText("Doctor Portal").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Doctor accounts are invited by clinic administration/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /create patient account/i })).not.toBeInTheDocument();
  });

  it("shows Administration context without public signup", () => {
    renderLogin("/login?portal=admin");
    expect(screen.getAllByText("Clinic Administration").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Administrative access is issued privately/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /create patient account/i })).not.toBeInTheDocument();
  });

  it.each([
    ["patient", "PATIENT", "Patient destination"],
    ["doctor", "DOCTOR", "Doctor destination"],
    ["admin", "ADMIN", "Admin destination"],
  ] as const)("routes a matching %s profile to its authoritative portal", async (portal, role, destination) => {
    auth.signIn.mockResolvedValueOnce({ role });
    renderLogin(`/login?portal=${portal}`);
    await submit();
    expect(await screen.findByText(destination)).toBeInTheDocument();
  });

  it("cannot turn a Patient into a Doctor and presents a role mismatch action", async () => {
    const patient = { role: "PATIENT" as const };
    auth.profile = patient;
    auth.signIn.mockResolvedValueOnce(patient);
    renderLogin("/login?portal=doctor");
    await submit();
    expect(await screen.findByText("This account belongs to the Patient Portal.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue to Patient Portal/i })).toBeInTheDocument();
    expect(auth.signIn).toHaveBeenCalledWith({ email: "person@example.test", password: "Password123!" });
  });

  it("keeps entered credentials visible and displays a useful failed-sign-in error", async () => {
    auth.signIn.mockRejectedValueOnce(new Error("The email or password is incorrect."));
    renderLogin();
    await submit("invited@example.test");
    expect(await screen.findByRole("alert")).toHaveTextContent("The email or password is incorrect.");
    expect(screen.getByLabelText("Email address")).toHaveValue("invited@example.test");
    expect(screen.getByLabelText("Password")).toHaveValue("Password123!");
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledTimes(1));
  });

  it("keeps all three portal choices available as touch-friendly tabs", () => {
    renderLogin();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    fireEvent.click(screen.getByRole("tab", { name: /admin/i }));
    expect(screen.getByRole("tab", { name: /admin/i })).toHaveAttribute("aria-selected", "true");
  });
});
