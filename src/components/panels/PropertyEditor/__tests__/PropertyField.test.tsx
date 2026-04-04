import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PropertyField } from "../PropertyField";

describe("PropertyField", () => {
  it("should render label and input", () => {
    render(<PropertyField label="Name" value="Test Value" />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Value")).toBeInTheDocument();
  });

  it("should render text input by default", () => {
    render(<PropertyField label="Name" value="Test" />);

    const input = screen.getByDisplayValue("Test");
    expect(input).toHaveAttribute("type", "text");
  });

  it("should render number input when type is number", () => {
    render(<PropertyField label="X" value={100} type="number" />);

    const input = screen.getByDisplayValue("100");
    expect(input).toHaveAttribute("type", "number");
  });

  it("should render textarea when type is textarea", () => {
    render(<PropertyField label="Description" value="Long text here" type="textarea" />);

    const textarea = screen.getByDisplayValue("Long text here");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("should call onChange when value changes", () => {
    const onChange = vi.fn();
    render(<PropertyField label="Name" value="Test" onChange={onChange} />);

    const input = screen.getByDisplayValue("Test");
    fireEvent.change(input, { target: { value: "New Value" } });

    expect(onChange).toHaveBeenCalledWith("New Value");
  });

  it("should disable input when disabled prop is true", () => {
    render(<PropertyField label="ID" value="node-123" disabled />);

    const input = screen.getByDisplayValue("node-123");
    expect(input).toBeDisabled();
  });

  it("should show placeholder when provided", () => {
    render(<PropertyField label="Name" value="" placeholder="Enter name..." />);

    const input = screen.getByPlaceholderText("Enter name...");
    expect(input).toBeInTheDocument();
  });

  it("should not update value when disabled", () => {
    const onChange = vi.fn();
    render(<PropertyField label="ID" value="123" disabled onChange={onChange} />);

    const input = screen.getByDisplayValue("123") as HTMLInputElement;

    // Disabled inputs should not accept changes
    expect(input).toBeDisabled();
    expect(input.value).toBe("123");
  });
});
