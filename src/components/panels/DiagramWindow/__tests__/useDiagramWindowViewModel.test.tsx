import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMermaidLayoutGraphFromMarkdownAnalysis } from "../mermaidLayoutGraph";
import { useDiagramWindowViewModel } from "../useDiagramWindowViewModel";

const mocks = vi.hoisted(() => ({
  useMarkdownProjectionMermaid: vi.fn(),
  useMermaidRenderer: vi.fn(),
}));

vi.mock("../useMarkdownProjectionMermaid", () => ({
  useMarkdownProjectionMermaid: (params: unknown) => mocks.useMarkdownProjectionMermaid(params),
}));

vi.mock("../useMermaidRenderer", () => ({
  useMermaidRenderer: (params: unknown) => mocks.useMermaidRenderer(params),
}));

const COPY = {
  emptyMermaidSource: "Empty Mermaid diagram source",
  mermaidLoading: "Loading Mermaid runtime...",
  mermaidUnsupported: "Unsupported Mermaid dialect for inline render",
};

function Probe({ path, content }: { path: string; content: string }) {
  const vm = useDiagramWindowViewModel({
    path,
    content,
    copy: COPY,
  });

  return (
    <div>
      <div data-testid="kind">{vm.kind}</div>
      <div data-testid="display-mode">{vm.displayMode}</div>
      <div data-testid="has-bpmn">{String(vm.hasBpmn)}</div>
      <div data-testid="has-mermaid">{String(vm.hasMermaid)}</div>
      <div data-testid="show-bpmn">{String(vm.showBpmn)}</div>
      <div data-testid="show-mermaid">{String(vm.showMermaid)}</div>
      <div data-testid="analysis-loading">{String(vm.analysisLoading)}</div>
      <div data-testid="reset-token">{String(vm.mermaidResetToken)}</div>
      <div data-testid="mode-options">
        {vm.mermaidModeOptions.map((option) => option.label).join("|")}
      </div>
      <button type="button" onClick={vm.resetMermaidView}>
        reset
      </button>
      <button type="button" onClick={() => vm.setDisplayMode("mermaid")}>
        mermaid
      </button>
    </div>
  );
}

describe("useDiagramWindowViewModel", () => {
  it("derives mermaid state from embedded mermaid source", () => {
    mocks.useMarkdownProjectionMermaid.mockReturnValue({
      analysisMermaidSources: [],
      analysisLayoutGraphs: [],
      analysisLoading: false,
    });
    mocks.useMermaidRenderer.mockReturnValue(null);

    render(<Probe path="docs/a.md" content={"```mermaid\ngraph TD\nA --> B\n```"} />);

    expect(screen.getByTestId("kind").textContent).toBe("mermaid");
    expect(screen.getByTestId("display-mode").textContent).toBe("mermaid");
    expect(screen.getByTestId("has-bpmn").textContent).toBe("false");
    expect(screen.getByTestId("has-mermaid").textContent).toBe("true");
    expect(screen.getByTestId("show-bpmn").textContent).toBe("false");
    expect(screen.getByTestId("show-mermaid").textContent).toBe("true");
    expect(screen.getByTestId("mode-options").textContent).toBe(
      "Top to Bottom|Left to Right|Right to Left|Bottom to Top|Sequence|State",
    );
  });

  it("supports reset token increment and mode switch in mixed diagram mode", () => {
    mocks.useMarkdownProjectionMermaid.mockReturnValue({
      analysisMermaidSources: [],
      analysisLayoutGraphs: [],
      analysisLoading: false,
    });
    mocks.useMermaidRenderer.mockReturnValue(null);

    render(
      <Probe
        path="workflow/dual.bpmn"
        content={"<bpmn:definitions></bpmn:definitions>\n```mermaid\ngraph TD\nA-->B\n```"}
      />,
    );

    expect(screen.getByTestId("kind").textContent).toBe("both");
    expect(screen.getByTestId("display-mode").textContent).toBe("split");
    expect(screen.getByTestId("show-bpmn").textContent).toBe("true");
    expect(screen.getByTestId("show-mermaid").textContent).toBe("true");
    expect(screen.getByTestId("reset-token").textContent).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    fireEvent.click(screen.getByRole("button", { name: "mermaid" }));

    expect(screen.getByTestId("reset-token").textContent).toBe("1");
    expect(screen.getByTestId("display-mode").textContent).toBe("mermaid");
    expect(screen.getByTestId("show-bpmn").textContent).toBe("false");
    expect(screen.getByTestId("show-mermaid").textContent).toBe("true");
  });

  it("uses markdown analysis fallback mermaid source when signature has none", () => {
    mocks.useMarkdownProjectionMermaid.mockReturnValue({
      analysisMermaidSources: ["flowchart TD\nX --> Y"],
      analysisLayoutGraphs: [],
      analysisLoading: true,
    });
    mocks.useMermaidRenderer.mockReturnValue(null);

    render(<Probe path="docs/plain.md" content={"# Plain markdown without embedded blocks"} />);

    expect(screen.getByTestId("kind").textContent).toBe("mermaid");
    expect(screen.getByTestId("analysis-loading").textContent).toBe("true");
    expect(screen.getByTestId("has-mermaid").textContent).toBe("true");
  });

  it("surfaces structure-backed alternate views for sequence sources", () => {
    mocks.useMarkdownProjectionMermaid.mockReturnValue({
      analysisMermaidSources: [],
      analysisLayoutGraphs: [],
      analysisLoading: false,
    });
    mocks.useMermaidRenderer.mockReturnValue(null);

    render(<Probe path="docs/sequence.mmd" content={"sequenceDiagram\nAlice->>Bob: hello"} />);

    expect(screen.getByTestId("kind").textContent).toBe("mermaid");
    expect(screen.getByTestId("mode-options").textContent).toBe(
      "Sequence|Top to Bottom|Left to Right|Right to Left|Bottom to Top|State",
    );
  });

  it("prefers structured analysis graphs over fallback mermaid projection strings", () => {
    const analysisGraph = createMermaidLayoutGraphFromMarkdownAnalysis(
      [
        {
          id: "doc",
          kind: "document",
          label: "System Overview",
          depth: 0,
          lineStart: 1,
          lineEnd: 10,
        },
        {
          id: "search",
          kind: "section",
          label: "Search",
          depth: 1,
          lineStart: 4,
          lineEnd: 8,
          parentId: "doc",
        },
      ],
      [
        {
          id: "edge-1",
          kind: "contains",
          sourceId: "doc",
          targetId: "search",
          evidence: {
            path: "docs/system_overview.md",
            lineStart: 4,
            lineEnd: 4,
            confidence: 0.9,
          },
        },
      ],
    );
    expect(analysisGraph).not.toBeNull();

    mocks.useMarkdownProjectionMermaid.mockReturnValue({
      analysisMermaidSources: ["flowchart TD\nTemplate --> Placeholder"],
      analysisLayoutGraphs: analysisGraph ? [analysisGraph] : [],
      analysisLoading: false,
    });
    mocks.useMermaidRenderer.mockReturnValue(null);

    render(<Probe path="docs/plain.md" content={"# Plain markdown without embedded blocks"} />);

    expect(screen.getByTestId("mode-options").textContent).toBe(
      "Top to Bottom|Left to Right|Right to Left|Bottom to Top|Sequence|State",
    );
    expect(mocks.useMermaidRenderer).toHaveBeenCalledWith({
      hasMermaid: true,
      displayMode: "mermaid",
      mermaidSources: [
        ["flowchart TD", 'doc["System Overview"]', 'search["Search"]', "doc --> search"].join("\n"),
        ["flowchart LR", 'doc["System Overview"]', 'search["Search"]', "doc --> search"].join("\n"),
        ["flowchart RL", 'doc["System Overview"]', 'search["Search"]', "doc --> search"].join("\n"),
        ["flowchart BT", 'doc["System Overview"]', 'search["Search"]', "doc --> search"].join("\n"),
        [
          "sequenceDiagram",
          "participant doc as System Overview",
          "participant search as Search",
          "doc->>search: System Overview to Search",
        ].join("\n"),
        [
          "stateDiagram-v2",
          'state "System Overview" as doc',
          'state "Search" as search',
          "doc --> search",
        ].join("\n"),
      ],
    });
  });
});
