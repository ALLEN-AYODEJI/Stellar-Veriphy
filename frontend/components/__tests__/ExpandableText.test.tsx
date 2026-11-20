import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { ExpandableText, truncateText } from "@/components/ui/ExpandableText";

describe("truncateText", () => {
  it("returns short values unchanged", () => {
    expect(truncateText("abc", 10)).toEqual({ preview: "abc", isTruncated: false });
  });

  it("treats a value exactly at the limit as not truncated", () => {
    expect(truncateText("0123456789", 10)).toEqual({ preview: "0123456789", isTruncated: false });
  });

  it("truncates long values and keeps the preview within the limit", () => {
    const result = truncateText("abcdefghijklmnop", 8);
    expect(result.isTruncated).toBe(true);
    expect(result.preview.endsWith("…")).toBe(true);
    expect(result.preview.length).toBeLessThanOrEqual(8);
  });

  it("falls back to a safe default for a non-finite limit", () => {
    expect(truncateText("short", Number.NaN)).toEqual({ preview: "short", isTruncated: false });
  });
});

describe("ExpandableText", () => {
  const long = "a".repeat(200);

  it("renders short values without a toggle", () => {
    render(<ExpandableText text="short value" label="name" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("short value")).toBeTruthy();
  });

  it("starts collapsed with an accessible toggle", () => {
    render(<ExpandableText text={long} label="content hash" maxChars={20} />);
    const button = screen.getByRole("button", { name: /show more content hash/i });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText(/…$/)).toBeTruthy();
    expect(screen.queryByText(long)).toBeNull();
  });

  it("expands to show the full value, updates aria-expanded, and announces the change", () => {
    render(<ExpandableText text={long} label="content hash" maxChars={20} />);
    const button = screen.getByRole("button", { name: /show more/i });

    fireEvent.click(button);

    expect(screen.getByRole("button", { name: /show less/i }).getAttribute("aria-expanded")).toBe(
      "true"
    );
    expect(screen.getByText(long)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Expanded");

    fireEvent.click(screen.getByRole("button", { name: /show less/i }));
    expect(screen.getByRole("status").textContent).toBe("Collapsed");
  });

  it("links the toggle to the text region it controls", () => {
    render(<ExpandableText text={long} maxChars={20} />);
    const button = screen.getByRole("button");
    const controlled = button.getAttribute("aria-controls");
    expect(controlled).toBeTruthy();
    expect(document.getElementById(controlled as string)).not.toBeNull();
  });
});
