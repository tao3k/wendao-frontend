import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ZenSearchPreviewPlaceholder } from "../ZenSearchPreviewPlaceholder";

describe("ZenSearchPreviewPlaceholder", () => {
  it("renders the localized hint text", () => {
    render(<ZenSearchPreviewPlaceholder locale="en" />);

    expect(screen.getByText("Select a result to preview details")).toBeInTheDocument();
  });
});
