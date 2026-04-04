import { describe, expect, it } from "vitest";
import { getMainViewCopy } from "./mainViewCopy";

describe("mainViewCopy", () => {
  it("returns english copy set", () => {
    const copy = getMainViewCopy("en");

    expect(copy.tabDiagram).toBe("Diagram");
    expect(copy.tabReferences).toBe("References");
    expect(copy.panelLoading).toBe("Loading panel...");
  });

  it("returns chinese copy set", () => {
    const copy = getMainViewCopy("zh");

    expect(copy.tabDiagram).toBe("图示");
    expect(copy.tabReferences).toBe("引用");
    expect(copy.panelLoading).toBe("正在加载面板...");
  });
});
