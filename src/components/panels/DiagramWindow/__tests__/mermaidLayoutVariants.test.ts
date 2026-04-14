import { describe, expect, it } from "vitest";
import {
  createMermaidLayoutGraphFromMarkdownAnalysis,
  type MermaidLayoutGraph,
} from "../mermaidLayoutGraph";
import {
  buildMermaidLayoutVariants,
  buildMermaidLayoutVariantsFromGraphs,
} from "../mermaidLayoutVariants";

describe("mermaidLayoutVariants", () => {
  it("adds structure-backed multi-view variants for flowchart sources", () => {
    const variants = buildMermaidLayoutVariants(["flowchart TD\nA --> B"]);

    expect(variants).toHaveLength(6);
    expect(variants[0]).toEqual({
      label: "Top to Bottom",
      source: "flowchart TD\nA --> B",
    });
    expect(variants[1]).toEqual({
      label: "Left to Right",
      source: ["flowchart LR", "A", "B", "A --> B"].join("\n"),
    });
    expect(variants[2]?.label).toBe("Right to Left");
    expect(variants[3]?.label).toBe("Bottom to Top");
    expect(variants[4]).toEqual({
      label: "Sequence",
      source: ["sequenceDiagram", "participant A", "participant B", "A->>B: A to B"].join("\n"),
    });
    expect(variants[5]).toEqual({
      label: "State",
      source: ["stateDiagram-v2", "A --> B"].join("\n"),
    });
  });

  it("adds flowchart and state variants for sequence sources", () => {
    const variants = buildMermaidLayoutVariants(["sequenceDiagram\nAlice->>Bob: hello"]);

    expect(variants).toHaveLength(6);
    expect(variants[0]).toEqual({
      label: "Sequence",
      source: "sequenceDiagram\nAlice->>Bob: hello",
    });
    expect(variants[1]?.label).toBe("Top to Bottom");
    expect(variants[2]?.label).toBe("Left to Right");
    expect(variants[3]?.label).toBe("Right to Left");
    expect(variants[4]?.label).toBe("Bottom to Top");
    expect(variants[5]).toEqual({
      label: "State",
      source: ["stateDiagram-v2", "Alice --> Bob: hello"].join("\n"),
    });
  });

  it("builds layout variants directly from analysis graphs", () => {
    const graph = createMermaidLayoutGraphFromMarkdownAnalysis(
      [
        {
          id: "doc",
          kind: "document",
          label: "System Overview",
          depth: 0,
          lineStart: 1,
          lineEnd: 20,
        },
        {
          id: "search",
          kind: "section",
          label: "Search",
          depth: 1,
          lineStart: 5,
          lineEnd: 12,
          parentId: "doc",
        },
      ],
      [
        {
          id: "edge-1",
          kind: "contains",
          label: "",
          sourceId: "doc",
          targetId: "search",
          evidence: {
            path: "docs/system_overview.md",
            lineStart: 5,
            lineEnd: 5,
            confidence: 0.9,
          },
        },
      ],
    );

    expect(graph).not.toBeNull();

    const variants = buildMermaidLayoutVariantsFromGraphs([graph as MermaidLayoutGraph]);

    expect(variants).toHaveLength(6);
    expect(variants[0]).toEqual({
      label: "Top to Bottom",
      source: ["flowchart TD", 'doc["System Overview"]', 'search["Search"]', "doc --> search"].join(
        "\n",
      ),
    });
    expect(variants[4]).toEqual({
      label: "Sequence",
      source: [
        "sequenceDiagram",
        "participant doc as System Overview",
        "participant search as Search",
        "doc->>search: System Overview to Search",
      ].join("\n"),
    });
  });
});
