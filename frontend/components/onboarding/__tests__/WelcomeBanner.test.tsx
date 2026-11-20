import "@testing-library/jest-dom";

import { act, fireEvent, render, screen } from "@testing-library/react";

import { WELCOME_BANNER_STORAGE_PREFIX, WelcomeBanner } from "../WelcomeBanner";

const mockAuth = {
  hydrated: true,
  isAuthenticated: true,
  session: { subject: "GABC", role: "user" as "admin" | "moderator" | "user" },
};

jest.mock("@/context/AuthSessionContext", () => ({
  useAuthSession: () => mockAuth,
}));

describe("WelcomeBanner (#894)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockAuth.hydrated = true;
    mockAuth.isAuthenticated = true;
    mockAuth.session = { subject: "GABC", role: "user" };
  });

  it("shows a call to action to upload content for a signed-in creator", () => {
    render(<WelcomeBanner />);

    expect(screen.getByRole("heading", { name: "Welcome to StellarVeriphy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload content" })).toHaveAttribute(
      "href",
      "/creator/upload-content"
    );
  });

  it("is hidden for signed-out visitors", () => {
    mockAuth.isAuthenticated = false;
    mockAuth.session = null as unknown as typeof mockAuth.session;

    const { container } = render(<WelcomeBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is hidden for admins and moderators", () => {
    mockAuth.session = { subject: "GADMIN", role: "admin" };

    const { container } = render(<WelcomeBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is hidden until the session has hydrated", () => {
    mockAuth.hydrated = false;

    const { container } = render(<WelcomeBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("dismisses and persists the dismissal for the account", () => {
    render(<WelcomeBanner />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss welcome message" }));
    });

    expect(
      screen.queryByRole("heading", { name: "Welcome to StellarVeriphy" })
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem(`${WELCOME_BANNER_STORAGE_PREFIX}GABC`)).toBe("true");
  });

  it("stays hidden for an account that already dismissed it", () => {
    window.localStorage.setItem(`${WELCOME_BANNER_STORAGE_PREFIX}GABC`, "true");

    const { container } = render(<WelcomeBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("still shows for a different account on the same browser", () => {
    window.localStorage.setItem(`${WELCOME_BANNER_STORAGE_PREFIX}GOTHER`, "true");

    render(<WelcomeBanner />);
    expect(screen.getByRole("heading", { name: "Welcome to StellarVeriphy" })).toBeInTheDocument();
  });
});
