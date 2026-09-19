import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
vi.mock("../features/auth/auth-provider", () => ({
  useAuth: () => ({ profile: { fullName: "Dr. Test Doctor", role: "DOCTOR" }, signOut }),
}));

import { PortalLayout } from "./portal-layout";
import { PublicLayout } from "./public-layout";

describe("responsive navigation", () => {
  it("opens a functional public mobile navigation", () => {
    render(<MemoryRouter><Routes><Route element={<PublicLayout />}><Route path="*" element={<div>Page</div>} /></Route></Routes></MemoryRouter>);

    const toggle = screen.getByRole("button", { name: "Open navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const navigation = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(navigation).toBeInTheDocument();
    expect(navigation.querySelector('a[href="/login"]')).toHaveTextContent("Sign in");
    expect(navigation.querySelector('a[href="/signup"]')).toHaveTextContent("Book a visit");
  });

  it("makes every Doctor destination and sign out reachable from the mobile drawer", () => {
    render(<MemoryRouter initialEntries={["/doctor"]}><Routes><Route path="/doctor" element={<PortalLayout role="DOCTOR" />}><Route index element={<div>Dashboard content</div>} /></Route></Routes></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = document.getElementById("portal-mobile-navigation");
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveTextContent("Dashboard");
    expect(drawer).toHaveTextContent("Appointments");
    expect(drawer).toHaveTextContent("Schedule");
    expect(drawer).toHaveTextContent("Leave");
    expect(drawer).toHaveTextContent("Patients");
    expect(drawer).toHaveTextContent("Profile");
    expect(drawer).toHaveTextContent("Sign out");
  });
});
