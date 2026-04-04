import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type {
  CodeAstBlockModel,
  CodeAstDeclarationModel,
  CodeAstSymbolGroup,
} from "../StructuredDashboard/codeAstAnatomy";
import {
  CodeAstBlocksStage,
  CodeAstDeclarationStage,
  CodeAstSymbolsStage,
  CodeAstWaterfallHeader,
} from "../codeAstAnatomySections";
import { copyForLocale } from "../codeAstAnatomyViewModel";

vi.mock("../../code-syntax", () => ({
  CodeSyntaxHighlighter: ({ source }: { source: string }) => (
    <div data-testid="mock-code-syntax">{source}</div>
  ),
}));

describe("codeAstAnatomySections", () => {
  it("renders extracted waterfall slices and keeps pivot actions wired", () => {
    const copy = copyForLocale("en");
    const onPivotQuery = vi.fn();
    const declaration = {
      id: "decl-1",
      label: "process_data",
      kind: "function",
      path: "kernel/src/lib.rs",
      line: 12,
      signature: "fn process_data(input: &[u8]) -> Result<()>",
      query: "process_data",
      atom: {
        id: "ast:decl:1",
        displayId: "decl:1",
        semanticType: "declaration",
        fingerprint: "fp-decl",
        tokenEstimate: 21,
      },
    } as unknown as CodeAstDeclarationModel;
    const blocks = [
      {
        id: "block-1",
        kind: "validation",
        title: "Validation",
        lineRange: "L12-L18",
        excerpt: "if input.is_empty() { return Err(Empty); }",
        anchors: ["Empty"],
        query: "validation",
        atom: {
          id: "ast:block:1",
          displayId: "block:1",
          semanticType: "block",
          fingerprint: "fp-block",
          tokenEstimate: 18,
        },
      },
    ] as unknown as CodeAstBlockModel[];
    const symbolGroups = [
      {
        id: "locals",
        title: "Local Symbols",
        empty: "None",
        symbols: [
          {
            id: "sym-1",
            label: "config",
            kind: "type",
            path: "kernel/src/config.rs",
            line: 4,
            references: 2,
            query: "config",
            atom: {
              id: "ast:symbol:1",
              displayId: "symbol:1",
              semanticType: "symbol",
              fingerprint: "fp-symbol",
              tokenEstimate: 11,
            },
          },
        ],
      },
      {
        id: "anchors",
        title: "Pivot Anchors",
        empty: "None",
        symbols: [
          {
            id: "anchor-1",
            label: "Config",
            kind: "type",
            path: "kernel/src/config.rs",
            line: 4,
            references: 3,
            query: "Config",
            atom: {
              id: "ast:anchor:1",
              displayId: "anchor:1",
              semanticType: "anchor",
              fingerprint: "fp-anchor",
              tokenEstimate: 9,
            },
          },
        ],
      },
    ] as unknown as CodeAstSymbolGroup[];

    render(
      <div>
        <CodeAstWaterfallHeader
          copy={copy}
          declarationPath={declaration.path}
          sourcePath="kernel/src/lib.rs"
          sourceLineRange="L12-L18"
        />
        <CodeAstDeclarationStage
          locale="en"
          copy={copy}
          declaration={declaration}
          signatureRows={{
            parameters: [
              {
                id: "param-1",
                name: { label: "param", value: "input", query: "input" },
                type: { label: "type", value: "&[u8]", query: "&[u8]" },
              },
            ],
            returnPart: { label: "return", value: "Result<()>", query: "Result" },
          }}
          onPivotQuery={onPivotQuery}
        />
        <CodeAstBlocksStage
          locale="en"
          copy={copy}
          blocks={blocks}
          syntaxLanguage="rust"
          sourcePath="kernel/src/lib.rs"
          onPivotQuery={onPivotQuery}
        />
        <CodeAstSymbolsStage copy={copy} symbolGroups={symbolGroups} onPivotQuery={onPivotQuery} />
      </div>,
    );

    expect(screen.getByText("Code AST Waterfall")).toBeInTheDocument();
    expect(screen.getByText("Declaration Identity")).toBeInTheDocument();
    expect(screen.getByText("Logic Block Decomposition")).toBeInTheDocument();
    expect(screen.getByText("Symbol Semantic Overlay")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pivot declaration" }));
    fireEvent.click(screen.getByRole("button", { name: "Pivot block" }));
    fireEvent.click(screen.getByRole("button", { name: "Pivot symbol" }));
    fireEvent.click(screen.getByRole("button", { name: "Pivot anchor" }));

    expect(onPivotQuery).toHaveBeenCalledWith("process_data");
    expect(onPivotQuery).toHaveBeenCalledWith("validation");
    expect(onPivotQuery).toHaveBeenCalledWith("config");
    expect(onPivotQuery).toHaveBeenCalledWith("Config");
  });
});
