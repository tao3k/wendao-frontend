import { describe, expect, it } from "vitest";

import * as codeSyntax from "./index";

describe("code-syntax barrel", () => {
  it("exports the generic Shiki-backed syntax highlighter only", () => {
    expect(codeSyntax.CodeSyntaxHighlighter).toBeTruthy();
    expect(codeSyntax.normalizeCodeLanguage).toBeTruthy();
    expect(codeSyntax).not.toHaveProperty("TypeScriptSyntaxHighlighter");
  });
});
