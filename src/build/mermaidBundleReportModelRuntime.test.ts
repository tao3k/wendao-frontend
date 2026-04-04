import { describe, expect, it } from "vitest";

describe("mermaid-bundle-report model/runtime split", () => {
  it("keeps the barrel aligned with the split model and runtime modules", async () => {
    const barrel = await import("../../scripts/build/index.mjs");
    const model = await import("../../scripts/build/mermaid-bundle-report-model.mjs");
    const runtime = await import("../../scripts/build/mermaid-bundle-report-runtime.mjs");

    expect(barrel.buildMermaidBundleReport).toBe(model.buildMermaidBundleReport);
    expect(barrel.runMermaidBundleReport).toBe(runtime.runMermaidBundleReport);
  });
});
