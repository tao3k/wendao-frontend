import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MainView } from "./MainView";
import type { AcademicTopology } from "../../../types";

const directReaderSpy = vi.fn();
const graphViewSpy = vi.fn();
const diagramWindowSpy = vi.fn();

vi.mock("../GraphView", () => ({
  GraphView: (props: Record<string, unknown>) => {
    graphViewSpy(props);
    return <div data-testid="graph-view" />;
  },
}));

vi.mock("../DirectReader", () => ({
  DirectReader: (props: Record<string, unknown>) => {
    directReaderSpy(props);
    return <div data-testid="direct-reader" />;
  },
}));

vi.mock("../DiagramWindow", () => ({
  DiagramWindow: (props: Record<string, unknown>) => {
    diagramWindowSpy(props);
    return <div data-testid="diagram-window" />;
  },
}));

describe("MainView", () => {
  const topology: AcademicTopology = {
    nodes: [{ id: "T1", name: "Target", type: "task", position: [12, -4, 18] }],
    links: [],
  };

  beforeEach(() => {
    directReaderSpy.mockClear();
    graphViewSpy.mockClear();
    diagramWindowSpy.mockClear();
  });

  it("renders cockpit tabs and guidance text", async () => {
    render(
      <MainView
        topology={topology}
        isVfsLoading={false}
        selectedFile={null}
        selectedNode={null}
        onNodeClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Diagram" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "References" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Graph" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Content" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "References" }));
    expect(screen.getAllByText("References").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Select a file from the project tree to inspect references and content."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    await waitFor(() => {
      expect(screen.getByTestId("graph-view")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Content" }));
    expect(
      screen.getByText("Select a file from the project tree to open its content."),
    ).toBeInTheDocument();
  });

  it("renders live reference details for the selected file", () => {
    render(
      <MainView
        topology={topology}
        isVfsLoading={false}
        selectedFile={{
          path: "knowledge/context.md",
          category: "knowledge",
          projectName: "kernel",
          rootLabel: "knowledge",
          content: "# context",
        }}
        relationships={[
          { from: "knowledge/context.md", to: "skills/writer/SKILL.md", type: "outgoing" },
          { from: "docs/guide.md", to: "knowledge/context.md", type: "incoming" },
        ]}
        selectedNode={null}
        onNodeClick={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "References" }));

    expect(screen.getByText("Focused file")).toBeInTheDocument();
    expect(screen.getByText("Project: kernel")).toBeInTheDocument();
    expect(screen.getByText("Root: knowledge")).toBeInTheDocument();
    expect(screen.getByText("knowledge/context.md")).toBeInTheDocument();
    expect(screen.getByText("skills/writer/SKILL.md")).toBeInTheDocument();
    expect(screen.getByText("docs/guide.md")).toBeInTheDocument();
    expect(screen.getByText("outgoing")).toBeInTheDocument();
    expect(screen.getByText("incoming")).toBeInTheDocument();
  });

  it("forwards search jump metadata into DirectReader on the content tab", async () => {
    render(
      <MainView
        topology={topology}
        isVfsLoading={false}
        selectedFile={{
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          category: "doc",
          content: "pub struct RepoScanner {}",
          line: 10,
          lineEnd: 12,
          column: 4,
        }}
        relationships={[]}
        selectedNode={null}
        onNodeClick={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Content" }));

    await waitFor(() => {
      expect(directReaderSpy).toHaveBeenCalled();
    });

    const lastDirectReaderCall = directReaderSpy.mock.calls.at(-1)?.[0] as
      | { path: string; line?: number; lineEnd?: number; column?: number; content?: string }
      | undefined;

    expect(lastDirectReaderCall).toMatchObject({
      path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
      line: 10,
      lineEnd: 12,
      column: 4,
      content: "pub struct RepoScanner {}",
    });
  });

  it("renders empty file content instead of treating it as no selection", async () => {
    render(
      <MainView
        topology={topology}
        isVfsLoading={false}
        selectedFile={{
          path: "docs/empty.md",
          category: "knowledge",
          content: "",
        }}
        relationships={[]}
        selectedNode={null}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(diagramWindowSpy).toHaveBeenCalled();
    });

    expect(
      screen.queryByText("Select a file from the project tree to inspect its diagram."),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Content" }));

    await waitFor(() => {
      expect(directReaderSpy).toHaveBeenCalled();
    });

    const lastDirectReaderCall = directReaderSpy.mock.calls.at(-1)?.[0] as
      | { path: string; content?: string }
      | undefined;

    expect(lastDirectReaderCall).toMatchObject({
      path: "docs/empty.md",
      content: "",
    });
    expect(
      screen.queryByText("Select a file from the project tree to open its content."),
    ).not.toBeInTheDocument();
  });

  it("forwards graph node selections to the parent file hydration callback", async () => {
    const onGraphFileSelect = vi.fn();

    render(
      <MainView
        topology={topology}
        isVfsLoading={false}
        selectedFile={{ path: "knowledge/context.md", category: "knowledge", content: "# context" }}
        relationships={[]}
        selectedNode={null}
        onGraphFileSelect={onGraphFileSelect}
        onNodeClick={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));

    await waitFor(() => {
      expect(graphViewSpy).toHaveBeenCalled();
    });

    const lastGraphViewCall = graphViewSpy.mock.calls.at(-1)?.[0] as
      | {
          onNodeClick: (
            nodeId: string,
            selection: {
              path: string;
              category: string;
              line?: number;
              lineEnd?: number;
              column?: number;
              graphPath?: string;
            },
          ) => void;
          enabled?: boolean;
        }
      | undefined;

    expect(lastGraphViewCall?.enabled).toBe(true);
    lastGraphViewCall?.onNodeClick("skills/writer/SKILL.md", {
      path: "skills/writer/SKILL.md",
      category: "skill",
    });

    expect(onGraphFileSelect).toHaveBeenCalledWith({
      path: "skills/writer/SKILL.md",
      category: "skill",
    });
  });

  it("activates the requested graph tab when App asks for graph focus", async () => {
    render(
      <MainView
        topology={topology}
        isVfsLoading={false}
        selectedFile={{ path: "knowledge/context.md", category: "knowledge", content: "# context" }}
        relationships={[]}
        selectedNode={null}
        requestedTab={{ tab: "graph", nonce: 1 }}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("graph-view")).toBeInTheDocument();
    });
  });

  it("activates the requested references tab when App asks for references focus", async () => {
    render(
      <MainView
        topology={topology}
        isVfsLoading={false}
        selectedFile={{ path: "knowledge/context.md", category: "knowledge", content: "# context" }}
        relationships={[
          { from: "knowledge/context.md", to: "skills/writer/SKILL.md", type: "outgoing" },
        ]}
        selectedNode={null}
        requestedTab={{ tab: "references", nonce: 1 }}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Focused file")).toBeInTheDocument();
      expect(screen.getByText("skills/writer/SKILL.md")).toBeInTheDocument();
    });
  });
});
