import type { ConfidenceResult } from "@stellarveriphy/shared/scoring";
import { render, screen } from "@testing-library/react";

import { VerificationResultSummary } from "@/components/verification/VerificationResultSummary";

describe("VerificationResultSummary (#900)", () => {
  const confidence: ConfidenceResult = {
    score: 35,
    level: "low",
    breakdown: [
      {
        key: "attestation",
        label: "Secure check completed",
        weight: 35,
        description: "",
        earned: 35,
      },
      {
        key: "contentHash",
        label: "Content fingerprint matches",
        weight: 20,
        description: "",
        earned: 0,
      },
      { key: "metadata", label: "Metadata complete", weight: 10, description: "", earned: 0 },
    ],
  };

  it("leads with the outcome headline", () => {
    render(
      <VerificationResultSummary status="failed" confidence={confidence} hasCertificate={false} />
    );
    expect(screen.getByRole("heading", { name: "Verification did not pass" })).toBeTruthy();
  });

  it("groups checks into passed and needs attention with counts", () => {
    render(
      <VerificationResultSummary status="failed" confidence={confidence} hasCertificate={false} />
    );
    expect(screen.getByText(/Passed/).textContent).toContain("(1 of 3)");
    expect(screen.getByText(/Needs attention/).textContent).toContain("(2 of 3)");
    // The same factor label also appears in the collapsed explanation, so match
    // at least one occurrence rather than exactly one.
    expect(screen.getAllByText("Secure check completed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not passed")).toHaveLength(2);
  });

  it("shows next steps for the status", () => {
    render(
      <VerificationResultSummary status="failed" confidence={confidence} hasCertificate={false} />
    );
    expect(screen.getByText(/Correct the manifest or content/)).toBeTruthy();
  });
});
