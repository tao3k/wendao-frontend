import { describe, expect, it } from "vitest";

import {
  BEAUTIFUL_MERMAID_PROVIDER_MANIFEST,
  COMPACT_FLOW_PROVIDER_MANIFEST,
  loadMermaidRuntimeProviderByName,
} from "../components/panels/mermaidRuntime";

describe("Mermaid provider manifest", () => {
  it("keeps the build-side manifest aligned with the runtime provider manifest", async () => {
    const buildManifestModule = await import("../../scripts/build/mermaid-provider-manifest.mjs");

    expect(buildManifestModule.BEAUTIFUL_MERMAID_PROVIDER_MANIFEST).toEqual(
      BEAUTIFUL_MERMAID_PROVIDER_MANIFEST,
    );
    expect(buildManifestModule.COMPACT_FLOW_PROVIDER_MANIFEST).toEqual(
      COMPACT_FLOW_PROVIDER_MANIFEST,
    );
  });

  it("loads the compact-flow provider through the shared runtime seam", async () => {
    const provider = await loadMermaidRuntimeProviderByName("compact-flow");

    expect(provider.manifest).toEqual(COMPACT_FLOW_PROVIDER_MANIFEST);
    const svg = provider.renderMermaid("graph TD\nA[Start] --> B[Finish]", {
      bg: "#000000",
      fg: "#ffffff",
      accent: "#33ccff",
      transparent: false,
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("Start");
    expect(svg).toContain("Finish");
    expect(svg).toContain('marker-end="url(#compact-flow-arrow)"');
  });
});
