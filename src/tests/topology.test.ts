import { describe, it, expect } from "vitest";
import { getRelationships } from "../utils/topology";
import { AcademicTopology } from "../types";

describe("Topological Logic Sync", () => {
  const mockTopology: AcademicTopology = {
    nodes: [
      { id: "A", name: "Alpha", type: "task" },
      { id: "B", name: "Beta", type: "task" },
      { id: "C", name: "Gamma", type: "task" },
    ],
    links: [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
    ],
  };

  it("should correctly identify relationships for a middle node", () => {
    const rels = getRelationships("B", mockTopology);
    expect(rels.incoming).toEqual(["A"]);
    expect(rels.outgoing).toEqual(["C"]);
  });

  it("should handle terminal nodes with no incoming/outgoing links", () => {
    const startNode = getRelationships("A", mockTopology);
    expect(startNode.incoming).toHaveLength(0);
    expect(startNode.outgoing).toEqual(["B"]);

    const endNode = getRelationships("C", mockTopology);
    expect(endNode.incoming).toEqual(["B"]);
    expect(endNode.outgoing).toHaveLength(0);
  });
});
