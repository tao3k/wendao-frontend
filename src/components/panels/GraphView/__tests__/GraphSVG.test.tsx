import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { GraphSVG } from "../GraphSVG";
import type { SimulatedLink, SimulatedNode } from "../types";

describe("GraphSVG", () => {
  it("shows the full center label while keeping a tooltip for every node", () => {
    const nodes: SimulatedNode[] = [
      {
        id: "kernel/docs/index.md",
        label: "Qianji Studio DocOS Kernel: Map of Content",
        path: "kernel/docs/index.md",
        nodeType: "doc",
        isCenter: true,
        distance: 0,
        x: 120,
        y: 80,
        vx: 0,
        vy: 0,
      },
      {
        id: "kernel/docs/testing.md",
        label: "Documentation Index",
        path: "kernel/docs/testing.md",
        nodeType: "doc",
        isCenter: false,
        distance: 1,
        x: 220,
        y: 140,
        vx: 0,
        vy: 0,
      },
    ];
    const links: SimulatedLink[] = [
      {
        source: "kernel/docs/index.md",
        target: "kernel/docs/testing.md",
        direction: "outgoing",
        distance: 1,
        sourceNode: nodes[0],
        targetNode: nodes[1],
      },
    ];

    const { container } = render(
      <GraphSVG
        width={400}
        height={240}
        nodes={nodes}
        links={links}
        onNodeClick={vi.fn()}
        onNodeDragStart={vi.fn()}
      />,
    );

    const labels = Array.from(container.querySelectorAll(".graph-node-label")).map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(["Qianji Studio DocOS Kernel: Map of Content", "Documentation I..."]);

    expect(container.querySelector(".graph-node--index-page")).toBeNull();
    expect(container.querySelector(".graph-node-index-badge-text")).toBeNull();
    expect(container.querySelectorAll(".graph-node-index-badge")).toHaveLength(0);

    const titles = Array.from(container.querySelectorAll("title")).map((node) => node.textContent);
    expect(titles).toEqual(["Qianji Studio DocOS Kernel: Map of Content", "Documentation Index"]);
  });
});
