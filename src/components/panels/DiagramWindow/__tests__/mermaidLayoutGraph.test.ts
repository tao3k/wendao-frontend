import { describe, expect, it } from "vitest";
import {
  compileMermaidLayoutGraph,
  compileMermaidSequenceGraph,
  compileMermaidStateGraph,
  createMermaidLayoutGraphFromCodeAstAnalysis,
  createMermaidLayoutGraphFromMarkdownAnalysis,
  parseMermaidLayoutGraph,
} from "../mermaidLayoutGraph";

describe("mermaidLayoutGraph", () => {
  it("compiles a flowchart graph into another real flow direction", () => {
    const graph = parseMermaidLayoutGraph("flowchart TD\nA -->|ships| B");

    expect(graph).not.toBeNull();
    expect(compileMermaidLayoutGraph(graph!, "LR")).toBe(
      ["flowchart LR", "A", "B", "A -->|ships| B"].join("\n"),
    );
  });

  it("preserves bounded flowchart grouping while changing direction", () => {
    const graph = parseMermaidLayoutGraph(
      'flowchart TD\nsubgraph cluster["Ops"]\nA["Worker"] --> B\nend',
    );

    expect(graph).not.toBeNull();
    expect(compileMermaidLayoutGraph(graph!, "BT")).toBe(
      [
        "flowchart BT",
        'subgraph compact_group_0["Ops"]',
        '  A["Worker"]',
        "  B",
        "end",
        "A --> B",
      ].join("\n"),
    );
  });

  it("compiles a flowchart graph into a structure-backed sequence view", () => {
    const graph = parseMermaidLayoutGraph(
      'flowchart TD\nsubgraph cluster["Ops"]\nA["Worker"] -->|ships| B\nend',
    );

    expect(graph).not.toBeNull();
    expect(compileMermaidSequenceGraph(graph!)).toBe(
      [
        "sequenceDiagram",
        "box Ops",
        "  participant A as Worker",
        "  participant B",
        "end",
        "A->>B: ships",
      ].join("\n"),
    );
  });

  it("parses sequence sources and recompiles them as flowchart and state views", () => {
    const graph = parseMermaidLayoutGraph(
      "sequenceDiagram\nparticipant Alice as API Gateway\nparticipant Bob\nAlice->>Bob: hello",
    );

    expect(graph).not.toBeNull();
    expect(graph?.sourceDialect).toBe("sequence");
    expect(compileMermaidLayoutGraph(graph!, "LR")).toBe(
      ["flowchart LR", 'Alice["API Gateway"]', "Bob", "Alice -->|hello| Bob"].join("\n"),
    );
    expect(compileMermaidStateGraph(graph!)).toBe(
      ["stateDiagram-v2", 'state "API Gateway" as Alice', "Alice --> Bob: hello"].join("\n"),
    );
  });

  it("parses er sources and recompiles them as flowchart views", () => {
    const graph = parseMermaidLayoutGraph("erDiagram\nCUSTOMER ||--o{ ORDER : places");

    expect(graph).not.toBeNull();
    expect(graph?.sourceDialect).toBe("er");
    expect(compileMermaidLayoutGraph(graph!, "TD")).toBe(
      ["flowchart TD", "CUSTOMER", "ORDER", "CUSTOMER -->|places (||--o{)| ORDER"].join("\n"),
    );
  });

  it("suppresses graph parsing for unsupported mermaid sources", () => {
    expect(parseMermaidLayoutGraph("classDiagram\nA <|-- B")).toBeNull();
  });

  it("creates a real layout graph from markdown analysis nodes and edges", () => {
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
          id: "task",
          kind: "task",
          label: "Ship MVP",
          depth: 1,
          lineStart: 10,
          lineEnd: 10,
          parentId: "doc",
        },
      ],
      [
        {
          id: "edge-1",
          kind: "nextstep",
          sourceId: "doc",
          targetId: "task",
          label: "next",
          evidence: {
            path: "docs/system_overview.md",
            lineStart: 10,
            lineEnd: 10,
            confidence: 0.8,
          },
        },
      ],
    );

    expect(graph).not.toBeNull();
    expect(compileMermaidLayoutGraph(graph!, "TD")).toBe(
      ["flowchart TD", 'doc["System Overview"]', 'task{"Ship MVP"}', "doc -->|next| task"].join(
        "\n",
      ),
    );
  });

  it("creates a real layout graph from code ast analysis nodes and edges", () => {
    const graph = createMermaidLayoutGraphFromCodeAstAnalysis(
      [
        {
          id: "file",
          kind: "module",
          label: "BaseModelica.jl",
          path: "sciml/src/BaseModelica.jl",
          lineStart: 1,
          lineEnd: 20,
        },
        {
          id: "module",
          kind: "type",
          label: "BaseModelica",
          path: "sciml/src/BaseModelica.jl",
          lineStart: 1,
          lineEnd: 20,
        },
      ],
      [
        {
          id: "edge-1",
          kind: "contains",
          sourceId: "file",
          targetId: "module",
        },
      ],
    );

    expect(graph).not.toBeNull();
    expect(compileMermaidLayoutGraph(graph!, "LR")).toBe(
      [
        "flowchart LR",
        'file["BaseModelica.jl"]',
        'module["BaseModelica"]',
        "file -->|contains| module",
      ].join("\n"),
    );
  });
});
