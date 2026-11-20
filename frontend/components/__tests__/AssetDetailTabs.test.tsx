import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import {
  type AssetDetailTabItem,
  AssetDetailTabs,
  resolveAssetDetailTab,
} from "@/components/AssetDetailTabs";

const mockPush = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/v/abc",
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const TABS: AssetDetailTabItem[] = [
  { id: "evidence", label: "Evidence", content: <p>evidence body</p> },
  { id: "history", label: "History", content: <p>history body</p> },
  { id: "manifest", label: "Manifest", content: <p>manifest body</p> },
];

describe("resolveAssetDetailTab", () => {
  const ids = ["evidence", "history", "manifest"];

  it("returns a valid requested tab", () => {
    expect(resolveAssetDetailTab("history", ids)).toBe("history");
  });

  it("falls back to the first tab for missing or unknown values", () => {
    expect(resolveAssetDetailTab(null, ids)).toBe("evidence");
    expect(resolveAssetDetailTab(undefined, ids)).toBe("evidence");
    expect(resolveAssetDetailTab("", ids)).toBe("evidence");
    expect(resolveAssetDetailTab("<script>", ids)).toBe("evidence");
    expect(resolveAssetDetailTab("ownership", ids)).toBe("evidence");
  });

  it("returns an empty string when there are no tabs", () => {
    expect(resolveAssetDetailTab("anything", [])).toBe("");
  });
});

describe("AssetDetailTabs", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearch = "";
  });

  it("opens the tab named in the URL", () => {
    mockSearch = "tab=manifest";
    render(<AssetDetailTabs tabs={TABS} />);
    expect(screen.getByRole("tab", { name: "Manifest" }).getAttribute("aria-selected")).toBe(
      "true"
    );
    expect(screen.getByText("manifest body")).toBeTruthy();
  });

  it("falls back to the first tab when the URL names an invalid tab", () => {
    mockSearch = "tab=bogus";
    render(<AssetDetailTabs tabs={TABS} />);
    expect(screen.getByRole("tab", { name: "Evidence" }).getAttribute("aria-selected")).toBe(
      "true"
    );
  });

  it("pushes a new history entry with the tab param and keeps other params", () => {
    mockSearch = "mode=authenticated&role=auditor";
    render(<AssetDetailTabs tabs={TABS} />);

    fireEvent.click(screen.getByRole("tab", { name: "History" }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const [url, options] = mockPush.mock.calls[0];
    const parsed = new URL(url, "http://localhost");
    expect(parsed.pathname).toBe("/v/abc");
    expect(parsed.searchParams.get("tab")).toBe("history");
    expect(parsed.searchParams.get("mode")).toBe("authenticated");
    expect(parsed.searchParams.get("role")).toBe("auditor");
    expect(options).toEqual({ scroll: false });
  });

  it("does not navigate when the already-active tab is clicked", () => {
    mockSearch = "tab=evidence";
    render(<AssetDetailTabs tabs={TABS} />);
    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
