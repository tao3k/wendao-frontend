import { describe, expect, it } from "vitest";
import {
  formatStructuredPath,
  formatStructuredSideBadge,
  resolveFocusedAnchor,
  resolveFocusedAnchorSide,
} from "../structuredDashboardShared";

describe("structuredDashboardShared", () => {
  it("compacts long paths and preserves short paths", () => {
    expect(formatStructuredPath("kernel/docs/guide.md")).toBe("kernel/docs/guide.md");
    expect(formatStructuredPath("kernel/docs/deep/section/guide.md")).toBe(
      "kernel/docs/.../guide.md",
    );
  });

  it("formats locale-aware side badges", () => {
    expect(formatStructuredSideBadge("en", "incoming")).toBe("In");
    expect(formatStructuredSideBadge("zh", "outgoing")).toBe("后");
  });

  it("resolves focused anchors from path trail and neighbor lists", () => {
    const centerAnchor = {
      label: "Center",
      value: "kernel/docs/index.md",
      query: "kernel/docs/index.md",
    };
    const pathTrail = [
      {
        label: "Trail",
        value: "kernel/docs/trail.md",
        query: "trail-query",
      },
    ];
    const neighbors = [
      {
        id: "neighbor-1",
        label: "Neighbor",
        path: "kernel/docs/neighbor.md",
        query: "neighbor-query",
      },
    ];

    expect(
      resolveFocusedAnchor("kernel/docs/trail.md", centerAnchor, pathTrail, neighbors),
    ).toEqual({
      label: "Trail",
      value: "kernel/docs/trail.md",
      query: "trail-query",
    });
    expect(resolveFocusedAnchor("neighbor-1", centerAnchor, pathTrail, neighbors)).toEqual({
      label: "Neighbor",
      value: "kernel/docs/neighbor.md",
      query: "neighbor-query",
    });
    expect(resolveFocusedAnchor("missing", centerAnchor, pathTrail, neighbors)).toEqual(
      centerAnchor,
    );
    expect(resolveFocusedAnchorSide("neighbor-1", centerAnchor, [{ id: "neighbor-1" }], [])).toBe(
      "incoming",
    );
    expect(resolveFocusedAnchorSide("neighbor-1", centerAnchor, [], [{ id: "neighbor-1" }])).toBe(
      "outgoing",
    );
    expect(
      resolveFocusedAnchorSide(centerAnchor.value, centerAnchor, [{ id: "neighbor-1" }], []),
    ).toBeNull();
  });
});
