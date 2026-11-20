import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import React from "react";

import { ProfileCompletenessPanel } from "@/components/profile/ProfileCompletenessPanel";

describe("ProfileCompletenessPanel (#911)", () => {
  it("groups missing details and links each to its field", () => {
    render(<ProfileCompletenessPanel values={{}} />);
    expect(screen.getByText("Required for verification", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Display name" })).toHaveAttribute("href", "#displayName");
    expect(screen.getByRole("link", { name: "Stellar account" })).toHaveAttribute("href", "#stellarAccount");
  });

  it("labels the sensitive email field", () => {
    render(<ProfileCompletenessPanel values={{}} />);
    expect(screen.getByText(/Sensitive · stored privately/)).toBeInTheDocument();
  });

  it("shows a completion message when nothing is missing", () => {
    render(
      <ProfileCompletenessPanel
        values={{
          displayName: "Jane",
          stellarAccount: "GAWZIBGIO2MM5AGBTCAUS4FCNFRYGCKKY3MAYE42BLHPTZVEL3K7LLGS",
          email: "jane@example.com",
          bio: "Bio",
        }}
      />,
    );
    expect(screen.getByText("Your profile is complete.")).toBeInTheDocument();
  });
});
