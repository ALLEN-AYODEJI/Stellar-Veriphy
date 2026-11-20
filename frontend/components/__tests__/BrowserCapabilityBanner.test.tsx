import "@testing-library/jest-dom";

import { act, fireEvent, render, screen } from "@testing-library/react";

import { BrowserCapabilityBanner } from "../BrowserCapabilityBanner";

type Check = {
  capability: string;
  supported: boolean;
  name: string;
  label: string;
  guidance: string;
};

const mockReport: { missing: Check[] } = { missing: [] };

jest.mock("@/config/environment", () => ({
  REQUIRED_CAPABILITIES: ["fetch", "cryptoSubtle"],
  detectCapabilities: () => ({ supported: mockReport.missing.length === 0, missing: mockReport.missing, checks: [] }),
}));

const NOTIFICATIONS: Check = {
  capability: "notifications",
  supported: false,
  name: "browser notifications",
  label: "Notifications API",
  guidance: "You won't receive browser notifications. Everything else still works.",
};

const FETCH: Check = {
  capability: "fetch",
  supported: false,
  name: "loading data",
  label: "Fetch API",
  guidance: "Pages can't load data in this browser. Update to the latest Chrome, Edge, Firefox, or Safari.",
};

describe("BrowserCapabilityBanner (#897)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockReport.missing = [];
  });

  it("renders nothing when every capability is available", () => {
    const { container } = render(<BrowserCapabilityBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the affected feature in plain language and gives a recommended action", () => {
    mockReport.missing = [NOTIFICATIONS];
    render(<BrowserCapabilityBanner />);

    expect(screen.getByText(/can't provide browser notifications in this browser/i)).toBeInTheDocument();
    expect(screen.getByText(/Everything else still works/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Some features aren't available in this browser" })).toBeInTheDocument();
  });

  it("keeps technical names out of the primary message", () => {
    mockReport.missing = [{ ...NOTIFICATIONS, label: "Notifications API" }];
    render(<BrowserCapabilityBanner />);

    const primary = screen.getByText(/can't provide/i);
    expect(primary).not.toHaveTextContent("Notifications API");
    // The technical name is still available inside the collapsed details.
    expect(screen.getByText("Notifications API")).toBeInTheDocument();
  });

  it("can be dismissed for the session and stays hidden on the next render", () => {
    mockReport.missing = [NOTIFICATIONS];
    const { unmount } = render(<BrowserCapabilityBanner />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss browser compatibility notice" }));
    });
    expect(screen.queryByText(/can't provide/i)).not.toBeInTheDocument();

    unmount();
    const { container } = render(<BrowserCapabilityBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("announces a missing required capability as an alert and cannot be dismissed", () => {
    mockReport.missing = [FETCH];
    render(<BrowserCapabilityBanner />);

    expect(screen.getByRole("alert")).toHaveTextContent("This browser isn't fully supported");
    expect(
      screen.queryByRole("button", { name: "Dismiss browser compatibility notice" })
    ).not.toBeInTheDocument();
  });

  it("lists each distinct recommended action once", () => {
    mockReport.missing = [FETCH, { ...FETCH, capability: "cryptoSubtle", name: "secure signing", label: "Web Crypto (crypto.subtle)", guidance: FETCH.guidance }];
    render(<BrowserCapabilityBanner />);

    const actions = screen.getAllByText(FETCH.guidance);
    expect(actions).toHaveLength(1);
  });
});
