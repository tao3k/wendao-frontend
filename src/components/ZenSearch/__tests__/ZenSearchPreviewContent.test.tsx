import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ZenSearchPreviewContent } from "../ZenSearchPreviewContent";

vi.mock("../../panels/DirectReader/DirectReader", () => ({
  DirectReader: (props: {
    content: string | null;
    contentType?: string | null;
    path?: string;
    loading: boolean;
    error: string | null;
  }) => (
    <div
      data-testid="mock-direct-reader"
      data-content={props.content ?? ""}
      data-content-type={props.contentType ?? ""}
      data-path={props.path ?? ""}
      data-loading={String(props.loading)}
      data-error={props.error ?? ""}
    />
  ),
}));

describe("ZenSearchPreviewContent", () => {
  it("renders loading and error info separately from the reader body", () => {
    render(
      <ZenSearchPreviewContent
        locale="en"
        content={null}
        contentPath="kernel/docs/index.md"
        loading={true}
        error="Preview load failed"
      />,
    );

    expect(screen.getByText("Loading preview...")).toBeInTheDocument();
    expect(screen.getByText("Preview load failed")).toBeInTheDocument();
    expect(screen.getByTestId("mock-direct-reader")).toHaveAttribute("data-loading", "true");
    expect(screen.getByTestId("mock-direct-reader")).toHaveAttribute(
      "data-error",
      "Preview load failed",
    );
  });

  it("suppresses loading chrome once content is already visible", () => {
    render(
      <ZenSearchPreviewContent
        locale="en"
        content={"module ADTypesEnzymeCoreExt\nend"}
        contentPath="ADTypes.jl/ext/ADTypesEnzymeCoreExt.jl"
        loading={true}
        error={null}
      />,
    );

    expect(screen.queryByText("Loading preview...")).toBeNull();
    expect(screen.getByTestId("mock-direct-reader")).toHaveAttribute("data-loading", "false");
    expect(screen.getByTestId("mock-direct-reader")).toHaveAttribute(
      "data-content",
      "module ADTypesEnzymeCoreExt\nend",
    );
    expect(screen.getByTestId("mock-direct-reader")).toHaveAttribute("data-content-type", "");
  });
});
