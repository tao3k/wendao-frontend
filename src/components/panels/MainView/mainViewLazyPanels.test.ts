import { describe, expect, it } from "vitest";
import { mainViewPanelLoaders } from "./mainViewLazyPanels";

describe("mainViewLazyPanels", () => {
  it("exposes stable loader shape for tab preloading", () => {
    expect(Object.keys(mainViewPanelLoaders).toSorted()).toEqual(["content", "diagram", "graph"]);
    expect(typeof mainViewPanelLoaders.diagram).toBe("function");
    expect(typeof mainViewPanelLoaders.graph).toBe("function");
    expect(typeof mainViewPanelLoaders.content).toBe("function");
  });
});
