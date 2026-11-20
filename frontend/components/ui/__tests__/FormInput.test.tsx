import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";

import { FormInput } from "../FormInput";

describe("FormInput required and optional markers (#895)", () => {
  it("announces required fields to assistive tech and sets the native required attribute", () => {
    render(<FormInput label="Email" required />);

    const input = screen.getByRole("textbox", { name: /email.*\(required\)/i });
    expect(input).toBeRequired();
    expect(screen.getByText("(required)", { exact: false })).toHaveClass("sr-only");
  });

  it("keeps the asterisk out of the accessibility tree so it is not read twice", () => {
    const { container } = render(<FormInput label="Email" required />);

    const asterisk = container.querySelector('span[aria-hidden="true"]');
    expect(asterisk).toHaveTextContent("*");
  });

  it("shows no marker on optional fields by default", () => {
    render(<FormInput label="Nickname" />);

    expect(screen.queryByText("(optional)")).not.toBeInTheDocument();
    expect(screen.queryByText("(required)", { exact: false })).not.toBeInTheDocument();
  });

  it("labels non-required fields as optional when showOptional is set", () => {
    render(<FormInput label="Nickname" showOptional />);

    expect(screen.getByText("(optional)")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nickname (optional)" })).not.toBeRequired();
  });

  it("does not show the optional label on required fields", () => {
    render(<FormInput label="Email" required showOptional />);

    expect(screen.queryByText("(optional)")).not.toBeInTheDocument();
  });
});
