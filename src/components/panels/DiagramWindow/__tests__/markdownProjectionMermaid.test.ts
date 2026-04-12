import { describe, expect, it } from "vitest";
import { buildMarkdownProjectionMermaid } from "../markdownProjectionMermaid";

describe("buildMarkdownProjectionMermaid", () => {
  it("builds a flowchart from markdown heading hierarchy", () => {
    const source = buildMarkdownProjectionMermaid(
      [
        "---",
        'title: "System Overview"',
        "---",
        "",
        "# System Overview",
        "",
        "Preface paragraph.",
        "",
        "## Search",
        "",
        "### Indexing",
        "",
        "## Runtime",
      ].join("\n"),
      "docs/system_overview.md",
    );

    expect(source).toContain('doc0["System Overview"]');
    expect(source).toContain('sec1["Overview"]');
    expect(source).toContain("doc0 --> sec1");
    expect(source).toContain('sec2["Search"]');
    expect(source).toContain('sec3["Indexing"]');
    expect(source).toContain("sec2 --> sec3");
    expect(source).toContain('sec4["Runtime"]');
    expect(source).toContain("doc0 --> sec4");
  });

  it("returns null for blank markdown content", () => {
    expect(buildMarkdownProjectionMermaid("   \n", "docs/blank.md")).toBeNull();
  });
});
