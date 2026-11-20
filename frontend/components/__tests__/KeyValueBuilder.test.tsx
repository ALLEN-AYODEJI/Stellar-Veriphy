import "@testing-library/jest-dom";

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { KeyValueBuilder, type KeyValuePair, moveItem } from "@/components/manifest/KeyValueBuilder";

const INITIAL: KeyValuePair[] = [
  { id: "a", key: "alpha", value: "1" },
  { id: "b", key: "beta", value: "2" },
  { id: "c", key: "gamma", value: "3" },
];

function keysInOrder(): string[] {
  return screen
    .getAllByPlaceholderText("Key")
    .map((input) => (input as HTMLInputElement).value);
}

describe("moveItem (#913)", () => {
  it("moves an item up and down", () => {
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });

  it("returns an unchanged copy when moving past either end", () => {
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});

describe("KeyValueBuilder keyboard reordering (#913)", () => {
  it("moves rows with the move buttons and reports the change", () => {
    const onChange = jest.fn();
    render(<KeyValueBuilder initialPairs={INITIAL} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Move row 2 up" }));

    expect(keysInOrder()).toEqual(["beta", "alpha", "gamma"]);
    expect(onChange).toHaveBeenLastCalledWith([
      INITIAL[1],
      INITIAL[0],
      INITIAL[2],
    ]);
    expect(screen.getByRole("status")).toHaveTextContent('Moved "beta" to position 1 of 3.');
  });

  it("disables move-up on the first row and move-down on the last", () => {
    render(<KeyValueBuilder initialPairs={INITIAL} onChange={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Move row 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move row 3 down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move row 1 down" })).toBeEnabled();
  });

  it("supports Alt+Arrow keyboard moves on a focused row", () => {
    const onChange = jest.fn();
    render(<KeyValueBuilder initialPairs={INITIAL} onChange={onChange} />);

    const row = screen.getByDisplayValue("gamma").closest("div.flex") as HTMLElement;
    fireEvent.keyDown(row, { key: "ArrowUp", altKey: true });

    expect(keysInOrder()).toEqual(["alpha", "gamma", "beta"]);
    expect(screen.getByRole("status")).toHaveTextContent('Moved "gamma" to position 2 of 3.');
  });

  it("ignores arrow keys without Alt so text editing is unaffected", () => {
    const onChange = jest.fn();
    render(<KeyValueBuilder initialPairs={INITIAL} onChange={onChange} />);
    const row = screen.getByDisplayValue("gamma").closest("div.flex") as HTMLElement;
    fireEvent.keyDown(row, { key: "ArrowUp" });
    expect(onChange).not.toHaveBeenCalled();
    expect(keysInOrder()).toEqual(["alpha", "beta", "gamma"]);
  });
});
