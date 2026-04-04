import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PropertyEditor } from "../PropertyEditor";
import type { AcademicNode } from "../../../../types";

describe("PropertyEditor", () => {
  const mockNode: AcademicNode = {
    id: "task-1",
    name: "Process Data",
    type: "task",
    position: [100, 200, 0],
  };

  const defaultProps = {
    node: mockNode,
    onUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show empty state when no node is selected", () => {
    render(<PropertyEditor node={null} />);

    expect(screen.getByText("Select a file or node to inspect details")).toBeInTheDocument();
  });

  it("should render tabs", () => {
    render(<PropertyEditor {...defaultProps} />);

    expect(screen.getByText("Properties")).toBeInTheDocument();
    expect(screen.getByText("Relationships")).toBeInTheDocument();
  });

  it("should display node name as title", () => {
    render(<PropertyEditor {...defaultProps} />);

    expect(screen.getByText("Process Data")).toBeInTheDocument();
  });

  it("should display node type badge", () => {
    render(<PropertyEditor {...defaultProps} />);

    expect(screen.getByText("task")).toBeInTheDocument();
  });

  it("should display node ID in disabled field", () => {
    render(<PropertyEditor {...defaultProps} />);

    const idInput = screen.getByDisplayValue("task-1");
    expect(idInput).toBeDisabled();
  });

  it("should display node name in editable field", () => {
    render(<PropertyEditor {...defaultProps} />);

    const nameInput = screen.getByDisplayValue("Process Data");
    expect(nameInput).not.toBeDisabled();
  });

  it("should call onUpdate when name is changed", () => {
    const onUpdate = vi.fn();
    render(<PropertyEditor {...defaultProps} onUpdate={onUpdate} />);

    const nameInput = screen.getByDisplayValue("Process Data");
    fireEvent.change(nameInput, { target: { value: "New Name" } });

    expect(onUpdate).toHaveBeenCalledWith({ name: "New Name" });
  });

  it("should show position fields when node has position", () => {
    render(<PropertyEditor {...defaultProps} />);

    expect(screen.getByText("Position")).toBeInTheDocument();
    expect(screen.getByDisplayValue("100")).toBeInTheDocument();
    expect(screen.getByDisplayValue("200")).toBeInTheDocument();
  });

  it("should not show position fields when node has no position", () => {
    const nodeWithoutPosition: AcademicNode = {
      id: "task-2",
      name: "No Position",
      type: "task",
    };

    render(<PropertyEditor node={nodeWithoutPosition} />);

    expect(screen.queryByText("Position")).not.toBeInTheDocument();
  });

  it("should call onUpdate with new position when X is changed", () => {
    const onUpdate = vi.fn();
    render(<PropertyEditor {...defaultProps} onUpdate={onUpdate} />);

    const xInput = screen.getByDisplayValue("100");
    fireEvent.change(xInput, { target: { value: "150" } });

    expect(onUpdate).toHaveBeenCalledWith({
      position: [150, 200, 0],
    });
  });

  it("should call onUpdate with new position when Y is changed", () => {
    const onUpdate = vi.fn();
    render(<PropertyEditor {...defaultProps} onUpdate={onUpdate} />);

    const yInput = screen.getByDisplayValue("200");
    fireEvent.change(yInput, { target: { value: "250" } });

    expect(onUpdate).toHaveBeenCalledWith({
      position: [100, 250, 0],
    });
  });

  it("should apply correct type class for task", () => {
    const { container } = render(<PropertyEditor {...defaultProps} />);

    expect(container.querySelector(".property-editor__type--task")).toBeInTheDocument();
  });

  it("should apply correct type class for event", () => {
    const eventNode: AcademicNode = {
      id: "start-1",
      name: "Start",
      type: "event",
    };

    const { container } = render(<PropertyEditor node={eventNode} />);

    expect(container.querySelector(".property-editor__type--event")).toBeInTheDocument();
  });

  it("should apply correct type class for gateway", () => {
    const gatewayNode: AcademicNode = {
      id: "gateway-1",
      name: "Decision",
      type: "gateway",
    };

    const { container } = render(<PropertyEditor node={gatewayNode} />);

    expect(container.querySelector(".property-editor__type--gateway")).toBeInTheDocument();
  });

  it("should format special types correctly", () => {
    const startEventNode: AcademicNode = {
      id: "start-1",
      name: "Start",
      type: "startEvent",
    };

    render(<PropertyEditor node={startEventNode} />);

    expect(screen.getByText("Start Event")).toBeInTheDocument();
  });

  it("should show Z position in metadata section", () => {
    render(<PropertyEditor {...defaultProps} />);

    // Expand metadata group
    fireEvent.click(screen.getByText("Metadata"));

    expect(screen.getByText("Z Position")).toBeInTheDocument();
  });

  it("should show type in metadata section", () => {
    const { container } = render(<PropertyEditor {...defaultProps} />);

    // Expand metadata group
    fireEvent.click(screen.getByText("Metadata"));

    // Look for type in the metadata section specifically
    const metadataSection = container.querySelector(".property-editor__metadata");
    expect(metadataSection?.textContent).toContain("task");
  });

  it("should use node ID as title when name is empty", () => {
    const nodeWithoutName: AcademicNode = {
      id: "node-123",
      name: "",
      type: "task",
    };

    render(<PropertyEditor node={nodeWithoutName} />);

    expect(screen.getByText("node-123")).toBeInTheDocument();
  });

  it("should switch to relationships tab when clicked", () => {
    const relationships = [{ type: "skill", to: "writer" }];
    render(<PropertyEditor {...defaultProps} relationships={relationships} />);

    fireEvent.click(screen.getByText("Relationships"));

    // Should show relationships count badge
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should show empty relationships state", () => {
    render(<PropertyEditor {...defaultProps} relationships={[]} />);

    fireEvent.click(screen.getByText("Relationships"));

    expect(screen.getByText("No relationship data available")).toBeInTheDocument();
  });

  it("surfaces the densest non-core graph layer by default when nothing is hovered", () => {
    const { container } = render(
      <PropertyEditor
        node={null}
        graphSummary={{
          totalNodes: 12,
          totalLinks: 9,
          hoveredLayer: null,
          layerSummaries: [
            { layer: 0, count: 1 },
            { layer: 1, count: 4 },
            { layer: 2, count: 7 },
          ],
        }}
      />,
    );

    expect(screen.getByText("Graph Summary")).toBeInTheDocument();
    expect(container.textContent).toContain("Ring 2");
    expect(container.textContent).toContain("12");
    expect(container.textContent).toContain("9");
  });

  it("keeps the hovered layer as the active graph insight focus", () => {
    const { container } = render(
      <PropertyEditor
        node={null}
        graphSummary={{
          totalNodes: 12,
          totalLinks: 9,
          hoveredLayer: 1,
          layerSummaries: [
            { layer: 0, count: 1 },
            { layer: 1, count: 4 },
            { layer: 2, count: 7 },
          ],
        }}
      />,
    );

    expect(container.textContent).toContain("Ring 1");
  });

  it("derives total nodes from layer summaries when the summary total is under-reported", () => {
    const { container } = render(
      <PropertyEditor
        node={null}
        graphSummary={{
          totalNodes: 1,
          totalLinks: 9,
          hoveredLayer: null,
          layerSummaries: [
            { layer: 0, count: 1 },
            { layer: 1, count: 4 },
            { layer: 2, count: 7 },
          ],
        }}
      />,
    );

    expect(screen.getByText("Graph Summary")).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === "12 nodes / 9 links"),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("Total Nodes12");
  });
});
