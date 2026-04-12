import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DiagramWindowToolbar } from "../DiagramWindowToolbar";

describe("DiagramWindowToolbar", () => {
  const copy = {
    modeTabLabel: "Diagram mode",
    modeBpmnLabel: "BPMN",
    modeCombinedLabel: "Combined",
    modeMermaidLabel: "Mermaid",
    modeBpmnAria: "BPMN diagram",
    modeCombinedAria: "Combined view",
    modeMermaidAria: "Mermaid diagram",
    panelBpmn: "BPMN-js",
    panelMermaid: "Mermaid",
    switchLayoutLabel: "Switch layout",
    resetViewLabel: "Reset view",
  };
  const mermaidModeOptions = [
    { index: 0, label: "Flowchart 1" },
    { index: 1, label: "Sequence 2" },
  ];

  it("renders chips and mode buttons when split mode is available", () => {
    const onModeChange = vi.fn();
    const onMermaidModeChange = vi.fn();
    const onResetView = vi.fn();

    render(
      <DiagramWindowToolbar
        hasBpmn
        hasMermaid
        canSplitView
        displayMode="split"
        mermaidModeOptions={mermaidModeOptions}
        activeMermaidIndex={0}
        copy={copy}
        onModeChange={onModeChange}
        onMermaidModeChange={onMermaidModeChange}
        onResetView={onResetView}
      />,
    );

    expect(
      screen.getByText("BPMN-js", { selector: ".diagram-window__chip--bpmn" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mermaid", { selector: ".diagram-window__chip--mermaid" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch layout" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "BPMN diagram" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Combined view" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Mermaid diagram" })).toBeInTheDocument();
  });

  it("forwards tab switch and reset callbacks", () => {
    const onModeChange = vi.fn();
    const onMermaidModeChange = vi.fn();
    const onResetView = vi.fn();

    render(
      <DiagramWindowToolbar
        hasBpmn
        hasMermaid
        canSplitView
        displayMode="bpmn"
        mermaidModeOptions={mermaidModeOptions}
        activeMermaidIndex={0}
        copy={copy}
        onModeChange={onModeChange}
        onMermaidModeChange={onMermaidModeChange}
        onResetView={onResetView}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Mermaid diagram" }));
    fireEvent.click(screen.getByRole("button", { name: "Switch layout" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Sequence 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));

    expect(onModeChange).toHaveBeenCalledWith("mermaid");
    expect(onMermaidModeChange).toHaveBeenCalledWith(1);
    expect(onResetView).toHaveBeenCalledTimes(1);
  });

  it("hides split tabs when split mode is not available", () => {
    render(
      <DiagramWindowToolbar
        hasBpmn
        hasMermaid={false}
        canSplitView={false}
        displayMode="bpmn"
        mermaidModeOptions={[]}
        activeMermaidIndex={0}
        copy={copy}
        onModeChange={vi.fn()}
        onMermaidModeChange={vi.fn()}
        onResetView={vi.fn()}
      />,
    );

    expect(screen.queryByRole("tablist", { name: "Diagram mode" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset view" })).not.toBeInTheDocument();
  });

  it("hides the switch layout button when there is no alternate layout", () => {
    render(
      <DiagramWindowToolbar
        hasBpmn={false}
        hasMermaid
        canSplitView={false}
        displayMode="mermaid"
        mermaidModeOptions={[{ index: 0, label: "Sequence" }]}
        activeMermaidIndex={0}
        copy={copy}
        onModeChange={vi.fn()}
        onMermaidModeChange={vi.fn()}
        onResetView={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Switch layout" })).not.toBeInTheDocument();
  });

  it("opens the switch layout popover and marks the active layout", () => {
    render(
      <DiagramWindowToolbar
        hasBpmn
        hasMermaid
        canSplitView
        displayMode="mermaid"
        mermaidModeOptions={mermaidModeOptions}
        activeMermaidIndex={0}
        copy={copy}
        onModeChange={vi.fn()}
        onMermaidModeChange={vi.fn()}
        onResetView={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Switch layout" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Flowchart 1" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "Sequence 2" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});
