import "@testing-library/jest-dom";

import { act, render, screen } from "@testing-library/react";
import React from "react";

import { OfflineStatusIndicator } from "@/components/OfflineStatusIndicator";

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => value });
}

describe("OfflineStatusIndicator (#910)", () => {
  afterEach(() => {
    setOnline(true);
    jest.useRealTimers();
  });

  it("shows nothing but an empty live region while online", () => {
    setOnline(true);
    render(<OfflineStatusIndicator />);
    expect(screen.queryByTestId("offline-status")).toBeNull();
    expect(screen.queryByTestId("online-status")).toBeNull();
  });

  it("explains offline state and distinguishes local from server actions", () => {
    setOnline(false);
    render(<OfflineStatusIndicator />);
    const notice = screen.getByTestId("offline-status");
    expect(notice).toHaveAttribute("role", "status");
    expect(notice).toHaveTextContent(/You're offline/);
    expect(notice).toHaveTextContent(/Available offline/);
    expect(notice).toHaveTextContent(/Needs a connection/);
  });

  it("announces reconnection and hides the announcement after a delay", () => {
    jest.useFakeTimers();
    setOnline(false);
    render(<OfflineStatusIndicator />);

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByTestId("online-status")).toHaveTextContent(/back online/);
    expect(screen.queryByTestId("offline-status")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.queryByTestId("online-status")).toBeNull();
  });

  it("reacts to going offline after mount", () => {
    setOnline(true);
    render(<OfflineStatusIndicator />);
    setOnline(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByTestId("offline-status")).toBeInTheDocument();
  });
});
