import "@testing-library/jest-dom";

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { SearchEmptyState } from "@/components/search/SearchEmptyState";

describe("SearchEmptyState (#912)", () => {
  it("explains a no-match result and offers clearing active filters", () => {
    const onClear = jest.fn();
    render(
      <SearchEmptyState variant="no-matches" noun="certificates" hasActiveFilters onClearFilters={onClear} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("No certificates match your search.");
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("hides the clear action when no filters are active", () => {
    render(<SearchEmptyState variant="no-matches" hasActiveFilters={false} onClearFilters={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Clear all filters" })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Try a different search term.");
  });

  it("distinguishes a server failure from an empty result and offers retry", () => {
    const onRetry = jest.fn();
    render(<SearchEmptyState variant="error" noun="certificates" offline={false} onRetry={onRetry} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("We couldn't load certificates right now.");
    expect(alert).toHaveTextContent("not an empty result");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("explains offline failures in plain language", () => {
    render(<SearchEmptyState variant="error" offline onRetry={jest.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("You're offline.");
    expect(screen.getByRole("alert")).toHaveTextContent("Search needs a connection");
  });

  it("disables retry while a retry is in progress", () => {
    render(<SearchEmptyState variant="error" offline={false} onRetry={jest.fn()} retrying />);
    expect(screen.getByRole("button", { name: "Retrying…" })).toBeDisabled();
  });
});
