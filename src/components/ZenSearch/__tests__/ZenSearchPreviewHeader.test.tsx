import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ZenSearchPreviewHeader } from "../ZenSearchPreviewHeader";

describe("ZenSearchPreviewHeader", () => {
  it("keeps loading hidden when content is already available", () => {
    render(
      <ZenSearchPreviewHeader
        locale="en"
        preview={{
          selectedResult: {
            title: "ADTypesEnzymeCoreExt",
            stem: "ADTypesEnzymeCoreExt",
            path: "ADTypes.jl/ext/ADTypesEnzymeCoreExt.jl",
          } as never,
          contentPath: "ADTypes.jl/ext/ADTypesEnzymeCoreExt.jl",
          loading: true,
          error: null,
          content: "module ADTypesEnzymeCoreExt\nend",
        }}
      />,
    );

    expect(screen.getByText("ADTypesEnzymeCoreExt")).toBeInTheDocument();
    expect(screen.queryByText("Loading preview...")).toBeNull();
  });
});
