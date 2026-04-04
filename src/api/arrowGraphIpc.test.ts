import { tableFromArrays, tableToIPC } from "apache-arrow";
import { describe, expect, it } from "vitest";

import { decodeGraphNeighborsFromArrowIpc, decodeTopology3DFromArrowIpc } from "./arrowGraphIpc";

describe("Arrow graph IPC decoder", () => {
  it("decodes graph neighbors payloads", () => {
    const payload = tableToIPC(
      tableFromArrays({
        rowType: ["node", "link"],
        nodeId: ["main/docs/index.md", null],
        nodeLabel: ["index.md", null],
        nodePath: ["main/docs/index.md", null],
        nodeType: ["doc", null],
        nodeIsCenter: [true, null],
        nodeDistance: [0, null],
        navigationPath: ["main/docs/index.md", null],
        navigationCategory: ["doc", null],
        navigationProjectName: ["main", null],
        navigationRootLabel: [null, null],
        navigationLine: [null, null],
        navigationLineEnd: [null, null],
        navigationColumn: [null, null],
        linkSource: [null, "main/docs/index.md"],
        linkTarget: [null, "main/docs/overview.md"],
        linkDirection: [null, "outgoing"],
        linkDistance: [null, 1],
      }),
      "stream",
    );

    expect(decodeGraphNeighborsFromArrowIpc(payload).center.path).toBe("main/docs/index.md");
  });

  it("decodes topology 3d payloads", () => {
    const payload = tableToIPC(
      tableFromArrays({
        rowType: ["node", "link", "cluster"],
        nodeId: ["kernel/docs/alpha.md", null, null],
        nodeName: ["alpha", null, null],
        nodeType: ["doc", null, null],
        nodePosX: [1, null, null],
        nodePosY: [2, null, null],
        nodePosZ: [3, null, null],
        nodeClusterId: ["kernel", null, null],
        linkFrom: [null, "kernel/docs/alpha.md", null],
        linkTo: [null, "kernel/docs/beta.md", null],
        linkLabel: [null, null, null],
        clusterId: [null, null, "kernel"],
        clusterName: [null, null, "kernel"],
        clusterCentroidX: [null, null, 0],
        clusterCentroidY: [null, null, 0],
        clusterCentroidZ: [null, null, 0],
        clusterNodeCount: [null, null, 1],
        clusterColor: [null, null, "#abcdef"],
      }),
      "stream",
    );

    expect(decodeTopology3DFromArrowIpc(payload)).toEqual({
      nodes: [
        {
          id: "kernel/docs/alpha.md",
          name: "alpha",
          nodeType: "doc",
          position: [1, 2, 3],
          clusterId: "kernel",
        },
      ],
      links: [
        {
          from: "kernel/docs/alpha.md",
          to: "kernel/docs/beta.md",
        },
      ],
      clusters: [
        {
          id: "kernel",
          name: "kernel",
          centroid: [0, 0, 0],
          nodeCount: 1,
          color: "#abcdef",
        },
      ],
    });
  });
});
