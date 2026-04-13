import { describe, expect, it } from "vitest";

import { buildMermaidBundleReport } from "../../scripts/build/index.mjs";

describe("buildMermaidBundleReport", () => {
  it("summarizes mermaid-related assets separately from the general JS frontier", () => {
    const report = buildMermaidBundleReport({
      providerManifest: {
        providerName: "beautiful-mermaid",
        packageName: "beautiful-mermaid",
        payloadPackageNames: ["mermaid", "beautiful-mermaid", "elkjs"],
        payloadPackageGroups: [
          { groupName: "official-mermaid", packageNames: ["mermaid"] },
          { groupName: "layout-engine", packageNames: ["elkjs"] },
          { groupName: "provider-wrapper", packageNames: ["beautiful-mermaid"] },
        ],
        supportedInlineDialects: ["flowchart", "graph", "state", "unknown"],
        payloadNotes: ["ELK-backed flowchart/state layout"],
      },
      mermaidAttributedAssets: ["vendors-async-misc.js"],
      mermaidPackageBreakdown: [
        { packageName: "mermaid", bytes: 2_320_000 },
        { packageName: "elkjs", bytes: 1_600_000 },
        { packageName: "beautiful-mermaid", bytes: 280_000 },
      ],
      mermaidModuleFamilyBreakdown: [
        { familyName: "shared-runtime", bytes: 730_000 },
        { familyName: "sequenceDiagram", bytes: 203_000 },
        { familyName: "flowDiagram", bytes: 104_000 },
      ],
      mermaidSharedRuntimeBreakdown: [
        { bucketName: "shared-chunk", bytes: 620_000 },
        { bucketName: "diagram-base", bytes: 64_000 },
        { bucketName: "shared-entry", bytes: 46_000 },
      ],
      mermaidSharedChunkCapabilityBreakdown: [
        { capabilityName: "shape-primitives", bytes: 310_000 },
        { capabilityName: "diagram-api-config", bytes: 185_000 },
        { capabilityName: "grammar-parsers", bytes: 140_000 },
      ],
      mermaidDiagramApiConfigBreakdown: [
        { segmentName: "theme-presets", bytes: 132_000 },
        { segmentName: "runtime-config", bytes: 31_000 },
        { segmentName: "diagram-api-core", bytes: 22_000 },
      ],
      mermaidThemePresetBreakdown: [
        { themeName: "redux-dark", bytes: 39_000 },
        { themeName: "default", bytes: 33_000 },
        { themeName: "neo-dark", bytes: 28_000 },
      ],
      mermaidShapePrimitiveBreakdown: [
        { familyName: "base-geometric", bytes: 106_000 },
        { familyName: "diagram-specialized", bytes: 41_000 },
        { familyName: "shape-infra", bytes: 32_000 },
      ],
      mermaidBaseGeometricBreakdown: [
        { clusterName: "rectilinear-panels", bytes: 34_000 },
        { clusterName: "cylindrical-wave", bytes: 26_000 },
        { clusterName: "polygonal-symbolic", bytes: 19_000 },
      ],
      mermaidDiagramSpecializedBreakdown: [
        { clusterName: "box-diagrams", bytes: 30_000 },
        { clusterName: "boards-and-mindmaps", bytes: 6_000 },
        { clusterName: "callout-symbols", bytes: 4_000 },
      ],
      mermaidRectilinearPanelBreakdown: [
        { clusterName: "annotated-panels", bytes: 13_000 },
        { clusterName: "angled-panels", bytes: 10_000 },
        { clusterName: "workflow-panels", bytes: 9_000 },
      ],
      mermaidBoxDiagramBreakdown: [
        { clusterName: "class-boxes", bytes: 15_000 },
        { clusterName: "er-boxes", bytes: 9_000 },
        { clusterName: "requirement-boxes", bytes: 6_000 },
      ],
      mermaidClassBoxBreakdown: [
        { clusterName: "class-box-shape", bytes: 8_000 },
        { clusterName: "class-shape-support", bytes: 7_000 },
      ],
      mermaidAnnotatedPanelBreakdown: [
        { clusterName: "header-panels", bytes: 9_000 },
        { clusterName: "note-cards", bytes: 3_000 },
        { clusterName: "label-panels", bytes: 1_000 },
      ],
      mermaidHeaderPanelBreakdown: [
        { clusterName: "rect-with-title", bytes: 4_000 },
        { clusterName: "tagged-rect", bytes: 3_000 },
        { clusterName: "window-pane", bytes: 2_000 },
      ],
      mermaidNoteCardBreakdown: [
        { clusterName: "card-surface", bytes: 2_000 },
        { clusterName: "note-surface", bytes: 1_000 },
      ],
      mermaidErBoxBreakdown: [
        { clusterName: "entity-renderer", bytes: 9_000 },
        { clusterName: "text-helper", bytes: 1_400 },
        { clusterName: "line-helper", bytes: 500 },
        { clusterName: "theme-scaffolding", bytes: 300 },
      ],
      mermaidErEntityRendererBreakdown: [
        { clusterName: "attribute-table-path", bytes: 7_300 },
        { clusterName: "renderer-setup", bytes: 900 },
        { clusterName: "label-only-path", bytes: 800 },
      ],
      mermaidErAttributeTableBreakdown: [
        { clusterName: "svg-row-rendering", bytes: 4_000 },
        { clusterName: "attribute-row-measurement", bytes: 1_500 },
        { clusterName: "column-width-normalization", bytes: 1_100 },
        { clusterName: "table-bootstrap", bytes: 600 },
      ],
      mermaidErSvgRowRenderingBreakdown: [
        { clusterName: "divider-drawing", bytes: 1_400 },
        { clusterName: "attribute-text-repositioning", bytes: 980 },
        { clusterName: "row-surface-drawing", bytes: 670 },
        { clusterName: "style-bounds-finalization", bytes: 650 },
        { clusterName: "name-and-theme-tagging", bytes: 300 },
      ],
      mermaidGrammarParserBreakdown: [
        { parserDomain: "class", bytes: 82_000 },
        { parserDomain: "state", bytes: 58_000 },
      ],
      fileSizes: {
        "vendors-async-misc.js": 900_000,
        "vendors.js": 200_000,
        "mermaid.js": 1_672_216,
        "shiki-core.js": 705_648,
        "vendors-async-mermaid-helper.js": 80_000,
        "main.css": 12_000,
      },
    });

    expect(report.largestAsyncAsset).toEqual({
      asset: "mermaid.js",
      size: 1_672_216,
    });
    expect(report.dominantMermaidAsset).toEqual({
      asset: "mermaid.js",
      size: 1_672_216,
    });
    expect(report.totalMermaidBytes).toBe(2_652_216);
    expect(report.mermaidAssets.map(({ asset }) => asset)).toEqual([
      "mermaid.js",
      "vendors-async-misc.js",
      "vendors-async-mermaid-helper.js",
    ]);
    expect(report.mermaidPackageBreakdown).toEqual([
      { packageName: "mermaid", bytes: 2_320_000 },
      { packageName: "elkjs", bytes: 1_600_000 },
      { packageName: "beautiful-mermaid", bytes: 280_000 },
    ]);
    expect(report.mermaidPayloadGroupBreakdown).toEqual([
      { groupName: "official-mermaid", bytes: 2_320_000 },
      { groupName: "layout-engine", bytes: 1_600_000 },
      { groupName: "provider-wrapper", bytes: 280_000 },
    ]);
    expect(report.mermaidModuleFamilyBreakdown).toEqual([
      { familyName: "shared-runtime", bytes: 730_000 },
      { familyName: "sequenceDiagram", bytes: 203_000 },
      { familyName: "flowDiagram", bytes: 104_000 },
    ]);
    expect(report.mermaidSharedRuntimeBreakdown).toEqual([
      { bucketName: "shared-chunk", bytes: 620_000 },
      { bucketName: "diagram-base", bytes: 64_000 },
      { bucketName: "shared-entry", bytes: 46_000 },
    ]);
    expect(report.mermaidSharedChunkCapabilityBreakdown).toEqual([
      { capabilityName: "shape-primitives", bytes: 310_000 },
      { capabilityName: "diagram-api-config", bytes: 185_000 },
      { capabilityName: "grammar-parsers", bytes: 140_000 },
    ]);
    expect(report.mermaidDiagramApiConfigBreakdown).toEqual([
      { segmentName: "theme-presets", bytes: 132_000 },
      { segmentName: "runtime-config", bytes: 31_000 },
      { segmentName: "diagram-api-core", bytes: 22_000 },
    ]);
    expect(report.mermaidThemePresetBreakdown).toEqual([
      { themeName: "redux-dark", bytes: 39_000 },
      { themeName: "default", bytes: 33_000 },
      { themeName: "neo-dark", bytes: 28_000 },
    ]);
    expect(report.mermaidShapePrimitiveBreakdown).toEqual([
      { familyName: "base-geometric", bytes: 106_000 },
      { familyName: "diagram-specialized", bytes: 41_000 },
      { familyName: "shape-infra", bytes: 32_000 },
    ]);
    expect(report.mermaidBaseGeometricBreakdown).toEqual([
      { clusterName: "rectilinear-panels", bytes: 34_000 },
      { clusterName: "cylindrical-wave", bytes: 26_000 },
      { clusterName: "polygonal-symbolic", bytes: 19_000 },
    ]);
    expect(report.mermaidDiagramSpecializedBreakdown).toEqual([
      { clusterName: "box-diagrams", bytes: 30_000 },
      { clusterName: "boards-and-mindmaps", bytes: 6_000 },
      { clusterName: "callout-symbols", bytes: 4_000 },
    ]);
    expect(report.mermaidRectilinearPanelBreakdown).toEqual([
      { clusterName: "annotated-panels", bytes: 13_000 },
      { clusterName: "angled-panels", bytes: 10_000 },
      { clusterName: "workflow-panels", bytes: 9_000 },
    ]);
    expect(report.mermaidBoxDiagramBreakdown).toEqual([
      { clusterName: "class-boxes", bytes: 15_000 },
      { clusterName: "er-boxes", bytes: 9_000 },
      { clusterName: "requirement-boxes", bytes: 6_000 },
    ]);
    expect(report.mermaidClassBoxBreakdown).toEqual([
      { clusterName: "class-box-shape", bytes: 8_000 },
      { clusterName: "class-shape-support", bytes: 7_000 },
    ]);
    expect(report.mermaidAnnotatedPanelBreakdown).toEqual([
      { clusterName: "header-panels", bytes: 9_000 },
      { clusterName: "note-cards", bytes: 3_000 },
      { clusterName: "label-panels", bytes: 1_000 },
    ]);
    expect(report.mermaidHeaderPanelBreakdown).toEqual([
      { clusterName: "rect-with-title", bytes: 4_000 },
      { clusterName: "tagged-rect", bytes: 3_000 },
      { clusterName: "window-pane", bytes: 2_000 },
    ]);
    expect(report.mermaidNoteCardBreakdown).toEqual([
      { clusterName: "card-surface", bytes: 2_000 },
      { clusterName: "note-surface", bytes: 1_000 },
    ]);
    expect(report.mermaidErBoxBreakdown).toEqual([
      { clusterName: "entity-renderer", bytes: 9_000 },
      { clusterName: "text-helper", bytes: 1_400 },
      { clusterName: "line-helper", bytes: 500 },
      { clusterName: "theme-scaffolding", bytes: 300 },
    ]);
    expect(report.mermaidErEntityRendererBreakdown).toEqual([
      { clusterName: "attribute-table-path", bytes: 7_300 },
      { clusterName: "renderer-setup", bytes: 900 },
      { clusterName: "label-only-path", bytes: 800 },
    ]);
    expect(report.mermaidErAttributeTableBreakdown).toEqual([
      { clusterName: "svg-row-rendering", bytes: 4_000 },
      { clusterName: "attribute-row-measurement", bytes: 1_500 },
      { clusterName: "column-width-normalization", bytes: 1_100 },
      { clusterName: "table-bootstrap", bytes: 600 },
    ]);
    expect(report.mermaidErSvgRowRenderingBreakdown).toEqual([
      { clusterName: "divider-drawing", bytes: 1_400 },
      { clusterName: "attribute-text-repositioning", bytes: 980 },
      { clusterName: "row-surface-drawing", bytes: 670 },
      { clusterName: "style-bounds-finalization", bytes: 650 },
      { clusterName: "name-and-theme-tagging", bytes: 300 },
    ]);
    expect(report.mermaidGrammarParserBreakdown).toEqual([
      { parserDomain: "class", bytes: 82_000 },
      { parserDomain: "state", bytes: 58_000 },
    ]);
    expect(report.providerManifest?.providerName).toBe("beautiful-mermaid");
  });
});
