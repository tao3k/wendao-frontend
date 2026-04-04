import { describe, expect, it } from "vitest";

import { loadMermaidRuntimeProviderByName } from "../components/panels/mermaidRuntime";

const THEME = {
  bg: "#000000",
  fg: "#ffffff",
  accent: "#33ccff",
  transparent: false,
} as const;

describe("compact-flow provider", () => {
  it("renders single-layer flowchart subgraphs with a bounded group shell", async () => {
    const provider = await loadMermaidRuntimeProviderByName("compact-flow");

    const svg = provider.renderMermaid("graph TD\nsubgraph Cluster\nA --> B\nend\nB --> C", THEME);

    expect(svg).toContain("<svg");
    expect(svg).toContain('data-compact-flow-group="compact_group_0"');
    expect(svg).toContain(">Cluster<");
    expect(svg).toContain(">A<");
    expect(svg).toContain(">B<");
    expect(svg).toContain(">C<");
  });

  it("renders flowchart decision nodes as bounded diamond nodes", async () => {
    const provider = await loadMermaidRuntimeProviderByName("compact-flow");

    const svg = provider.renderMermaid(
      "graph TD\nA --> B{Decision}\nB --> C[Yes]\nB --> D[No]",
      THEME,
    );

    expect(svg).toContain("<svg");
    expect(svg).toContain('<polygon points="');
    expect(svg).toContain(">Decision<");
    expect(svg).toContain(">Yes<");
    expect(svg).toContain(">No<");
  });

  it("renders single-layer state composites with a bounded group shell", async () => {
    const provider = await loadMermaidRuntimeProviderByName("compact-flow");

    const svg = provider.renderMermaid(
      "stateDiagram-v2\nstate Outer {\nIdle --> Running\n}\n[*] --> Outer",
      THEME,
    );

    expect(svg).toContain("<svg");
    expect(svg).toContain('data-compact-flow-group="compact_group_0"');
    expect(svg).toContain(">Outer<");
    expect(svg).toContain(">Idle<");
    expect(svg).toContain(">Running<");
  });
});
