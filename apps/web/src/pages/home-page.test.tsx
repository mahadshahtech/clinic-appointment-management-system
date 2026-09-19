import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { HomePage } from "./home-page";

describe("HomePage", () => {
  it("presents the clinic identity and primary action", () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: /care that feels personal/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /book an appointment/i })).toHaveAttribute("href", "/signup");
  });
});
