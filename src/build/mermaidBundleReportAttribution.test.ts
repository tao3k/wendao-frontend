import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  classifyMermaidAnnotatedPanelCluster,
  classifyMermaidDiagramApiConfigSegment,
  classifyMermaidBaseGeometricCluster,
  classifyMermaidBoxDiagramCluster,
  classifyMermaidClassBoxCluster,
  classifyMermaidHeaderPanelVariant,
  classifyMermaidNoteCardVariant,
  classifyMermaidDiagramSpecializedCluster,
  classifyMermaidGrammarParserDomain,
  classifyMermaidModuleFamily,
  classifyMermaidRectilinearPanelCluster,
  classifyMermaidShapePrimitiveFamily,
  classifyMermaidSharedChunkCapability,
  classifyMermaidSharedRuntimeBucket,
  classifyMermaidThemePresetVariant,
  collectJavaScriptSourceMapPackageAssets,
  collectMermaidSourceMapDiagramApiConfigByteBreakdown,
  collectMermaidSourceMapBaseGeometricByteBreakdown,
  collectMermaidSourceMapAnnotatedPanelByteBreakdown,
  collectMermaidSourceMapBoxDiagramByteBreakdown,
  collectMermaidSourceMapClassBoxByteBreakdown,
  collectMermaidSourceMapErAttributeTableByteBreakdown,
  collectMermaidSourceMapErSvgRowRenderingByteBreakdown,
  collectMermaidSourceMapErEntityRendererByteBreakdown,
  collectMermaidSourceMapHeaderPanelByteBreakdown,
  collectMermaidSourceMapNoteCardByteBreakdown,
  collectMermaidSourceMapErBoxByteBreakdown,
  collectMermaidSourceMapDiagramSpecializedByteBreakdown,
  collectJavaScriptSourceMapPackageByteBreakdown,
  collectMermaidSourceMapGrammarParserByteBreakdown,
  collectMermaidSourceMapModuleFamilyByteBreakdown,
  collectMermaidSourceMapShapePrimitiveByteBreakdown,
  collectMermaidSourceMapSharedChunkCapabilityByteBreakdown,
  collectMermaidSourceMapSharedRuntimeByteBreakdown,
  collectMermaidSourceMapThemePresetByteBreakdown,
  collectMermaidSourceMapRectilinearPanelByteBreakdown,
  extractNodeModulePackageName,
  extractNodeModuleRelativePath,
} from "../../scripts/build/mermaid-bundle-report-attribution.mjs";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { force: true, recursive: true });
    }),
  );
});

describe("extractNodeModulePackageName", () => {
  it("parses both pnpm and scoped package paths", () => {
    expect(
      extractNodeModulePackageName(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/flow.mjs",
      ),
    ).toBe("mermaid");
    expect(
      extractNodeModulePackageName(
        "/tmp/node_modules/.pnpm/@scope+pkg@1.0.0/node_modules/@scope/pkg/index.js",
      ),
    ).toBe("@scope/pkg");
  });
});

describe("extractNodeModuleRelativePath", () => {
  it("returns the package-relative source path for pnpm bundled modules", () => {
    expect(
      extractNodeModuleRelativePath(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/flow.mjs",
      ),
    ).toBe("dist/chunks/flow.mjs");
  });
});

describe("classifyMermaidModuleFamily", () => {
  it("normalizes hashed module file names into stable mermaid module families", () => {
    expect(
      classifyMermaidModuleFamily(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/flowDiagram-DWJPFMVM.mjs",
      ),
    ).toBe("flowDiagram");
    expect(
      classifyMermaidModuleFamily(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-ICPOFSXX.mjs",
      ),
    ).toBe("shared-runtime");
    expect(
      classifyMermaidModuleFamily(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/timeline-definition-GMOUNBTQ.mjs",
      ),
    ).toBe("timeline");
  });
});

describe("classifyMermaidSharedRuntimeBucket", () => {
  it("splits shared mermaid runtime files into stable runtime buckets", () => {
    expect(
      classifyMermaidSharedRuntimeBucket(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/mermaid.core.mjs",
      ),
    ).toBe("shared-entry");
    expect(
      classifyMermaidSharedRuntimeBucket(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-ICPOFSXX.mjs",
      ),
    ).toBe("shared-chunk");
    expect(
      classifyMermaidSharedRuntimeBucket(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/diagram-MMDJMWI5.mjs",
      ),
    ).toBe("diagram-base");
  });
});

describe("classifyMermaidSharedChunkCapability", () => {
  it("maps shared mermaid chunks onto stable capability clusters", () => {
    expect(
      classifyMermaidSharedChunkCapability(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-ICPOFSXX.mjs",
        "// src/diagram-api/detectType.ts\n// src/config.ts",
      ),
    ).toBe("diagram-api-config");
    expect(
      classifyMermaidSharedChunkCapability(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        "// src/rendering-util/rendering-elements/shapes/util.ts",
      ),
    ).toBe("shape-primitives");
    expect(
      classifyMermaidSharedChunkCapability(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-XPW4576I.mjs",
        "js-yaml 4.1.1",
      ),
    ).toBe("yaml-frontmatter");
    expect(
      classifyMermaidSharedChunkCapability(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-4TB4RGXK.mjs",
        "// src/diagrams/class/parser/classDiagram.jison",
      ),
    ).toBe("grammar-parsers");
  });
});

describe("classifyMermaidGrammarParserDomain", () => {
  it("extracts parser domains from grammar-backed mermaid shared chunks", () => {
    expect(
      classifyMermaidGrammarParserDomain(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-4TB4RGXK.mjs",
        "// src/diagrams/class/parser/classDiagram.jison",
      ),
    ).toBe("class");
    expect(
      classifyMermaidGrammarParserDomain(
        "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-OYMX7WX6.mjs",
        "// src/diagrams/state/parser/stateDiagram.jison",
      ),
    ).toBe("state");
  });
});

describe("classifyMermaidDiagramApiConfigSegment", () => {
  it("maps bundled diagram-api/config section markers onto stable segments", () => {
    expect(classifyMermaidDiagramApiConfigSegment("src/themes/theme-default.js")).toBe(
      "theme-presets",
    );
    expect(classifyMermaidDiagramApiConfigSegment("src/themes/theme-base.js")).toBe(
      "theme-support",
    );
    expect(classifyMermaidDiagramApiConfigSegment("src/config.ts")).toBe("runtime-config");
    expect(classifyMermaidDiagramApiConfigSegment("src/diagram-api/diagramAPI.ts")).toBe(
      "diagram-api-core",
    );
    expect(classifyMermaidDiagramApiConfigSegment("src/diagram-api/detectType.ts")).toBe(
      "type-detection",
    );
    expect(classifyMermaidDiagramApiConfigSegment("src/errors.ts")).toBe("shared-support");
    expect(classifyMermaidDiagramApiConfigSegment(null)).toBe("other-diagram-api-config");
  });
});

describe("classifyMermaidThemePresetVariant", () => {
  it("extracts stable theme preset names from bundled section markers", () => {
    expect(classifyMermaidThemePresetVariant("src/themes/theme-default.js")).toBe("default");
    expect(classifyMermaidThemePresetVariant("src/themes/theme-redux-dark.js")).toBe("redux-dark");
    expect(classifyMermaidThemePresetVariant("src/themes/theme-base.js")).toBeNull();
  });
});

describe("classifyMermaidShapePrimitiveFamily", () => {
  it("maps bundled shape sections onto stable shape families", () => {
    expect(
      classifyMermaidShapePrimitiveFamily("src/rendering-util/rendering-elements/shapes/circle.ts"),
    ).toBe("base-geometric");
    expect(
      classifyMermaidShapePrimitiveFamily(
        "src/rendering-util/rendering-elements/shapes/classBox.ts",
      ),
    ).toBe("diagram-specialized");
    expect(
      classifyMermaidShapePrimitiveFamily("src/rendering-util/rendering-elements/shapes/icon.ts"),
    ).toBe("icon-media");
    expect(
      classifyMermaidShapePrimitiveFamily(
        "src/rendering-util/rendering-elements/shapes/stateEnd.ts",
      ),
    ).toBe("state-family");
    expect(
      classifyMermaidShapePrimitiveFamily(
        "src/rendering-util/rendering-elements/intersect/intersect-rect.js",
      ),
    ).toBe("shape-infra");
    expect(
      classifyMermaidShapePrimitiveFamily("src/rendering-util/rendering-elements/clusters.js"),
    ).toBe("clusters");
    expect(classifyMermaidShapePrimitiveFamily(null)).toBe("other-shape-primitives");
  });
});

describe("classifyMermaidBaseGeometricCluster", () => {
  it("maps base geometric shapes onto stable cluster names", () => {
    expect(
      classifyMermaidBaseGeometricCluster("src/rendering-util/rendering-elements/shapes/circle.ts"),
    ).toBe("circular");
    expect(
      classifyMermaidBaseGeometricCluster(
        "src/rendering-util/rendering-elements/shapes/rectWithTitle.ts",
      ),
    ).toBe("rectilinear-panels");
    expect(
      classifyMermaidBaseGeometricCluster(
        "src/rendering-util/rendering-elements/shapes/triangle.ts",
      ),
    ).toBe("polygonal-symbolic");
    expect(
      classifyMermaidBaseGeometricCluster(
        "src/rendering-util/rendering-elements/shapes/curlyBraces.ts",
      ),
    ).toBe("curves-braces");
    expect(
      classifyMermaidBaseGeometricCluster(
        "src/rendering-util/rendering-elements/shapes/cylinder.ts",
      ),
    ).toBe("cylindrical-wave");
    expect(
      classifyMermaidBaseGeometricCluster(
        "src/rendering-util/rendering-elements/shapes/forkJoin.ts",
      ),
    ).toBe("directional-connectors");
    expect(
      classifyMermaidBaseGeometricCluster(
        "src/rendering-util/rendering-elements/shapes/classBox.ts",
      ),
    ).toBeNull();
  });
});

describe("classifyMermaidDiagramSpecializedCluster", () => {
  it("maps diagram-specialized shapes onto stable cluster names", () => {
    expect(
      classifyMermaidDiagramSpecializedCluster(
        "src/rendering-util/rendering-elements/shapes/erBox.ts",
      ),
    ).toBe("box-diagrams");
    expect(classifyMermaidDiagramSpecializedCluster("src/diagrams/class/shapeUtil.ts")).toBe(
      "box-diagrams",
    );
    expect(
      classifyMermaidDiagramSpecializedCluster(
        "src/rendering-util/rendering-elements/shapes/defaultMindmapNode.ts",
      ),
    ).toBe("boards-and-mindmaps");
    expect(
      classifyMermaidDiagramSpecializedCluster(
        "src/rendering-util/rendering-elements/shapes/bang.ts",
      ),
    ).toBe("callout-symbols");
    expect(
      classifyMermaidDiagramSpecializedCluster(
        "src/rendering-util/rendering-elements/shapes/circle.ts",
      ),
    ).toBeNull();
  });
});

describe("classifyMermaidRectilinearPanelCluster", () => {
  it("maps rectilinear panels onto stable cluster names", () => {
    expect(
      classifyMermaidRectilinearPanelCluster(
        "src/rendering-util/rendering-elements/shapes/rectWithTitle.ts",
      ),
    ).toBe("annotated-panels");
    expect(
      classifyMermaidRectilinearPanelCluster(
        "src/rendering-util/rendering-elements/shapes/subroutine.ts",
      ),
    ).toBe("workflow-panels");
    expect(
      classifyMermaidRectilinearPanelCluster(
        "src/rendering-util/rendering-elements/shapes/bowTieRect.ts",
      ),
    ).toBe("angled-panels");
    expect(
      classifyMermaidRectilinearPanelCluster(
        "src/rendering-util/rendering-elements/shapes/roundedRect.ts",
      ),
    ).toBe("basic-rects");
    expect(
      classifyMermaidRectilinearPanelCluster(
        "src/rendering-util/rendering-elements/shapes/triangle.ts",
      ),
    ).toBeNull();
  });
});

describe("classifyMermaidBoxDiagramCluster", () => {
  it("maps box-diagram sections onto stable box clusters", () => {
    expect(
      classifyMermaidBoxDiagramCluster("src/rendering-util/rendering-elements/shapes/erBox.ts"),
    ).toBe("er-boxes");
    expect(
      classifyMermaidBoxDiagramCluster("src/rendering-util/rendering-elements/shapes/classBox.ts"),
    ).toBe("class-boxes");
    expect(classifyMermaidBoxDiagramCluster("src/diagrams/class/shapeUtil.ts")).toBe("class-boxes");
    expect(
      classifyMermaidBoxDiagramCluster(
        "src/rendering-util/rendering-elements/shapes/requirementBox.ts",
      ),
    ).toBe("requirement-boxes");
    expect(
      classifyMermaidBoxDiagramCluster(
        "src/rendering-util/rendering-elements/shapes/defaultMindmapNode.ts",
      ),
    ).toBeNull();
  });
});

describe("classifyMermaidClassBoxCluster", () => {
  it("maps class-box sections onto stable class-box clusters", () => {
    expect(
      classifyMermaidClassBoxCluster("src/rendering-util/rendering-elements/shapes/classBox.ts"),
    ).toBe("class-box-shape");
    expect(classifyMermaidClassBoxCluster("src/diagrams/class/shapeUtil.ts")).toBe(
      "class-shape-support",
    );
    expect(
      classifyMermaidClassBoxCluster("src/rendering-util/rendering-elements/shapes/erBox.ts"),
    ).toBeNull();
  });
});

describe("classifyMermaidAnnotatedPanelCluster", () => {
  it("maps annotated panels onto stable annotated-panel clusters", () => {
    expect(
      classifyMermaidAnnotatedPanelCluster(
        "src/rendering-util/rendering-elements/shapes/rectWithTitle.ts",
      ),
    ).toBe("header-panels");
    expect(
      classifyMermaidAnnotatedPanelCluster(
        "src/rendering-util/rendering-elements/shapes/taggedRect.ts",
      ),
    ).toBe("header-panels");
    expect(
      classifyMermaidAnnotatedPanelCluster("src/rendering-util/rendering-elements/shapes/note.ts"),
    ).toBe("note-cards");
    expect(
      classifyMermaidAnnotatedPanelCluster("src/rendering-util/rendering-elements/shapes/card.ts"),
    ).toBe("note-cards");
    expect(
      classifyMermaidAnnotatedPanelCluster(
        "src/rendering-util/rendering-elements/shapes/labelRect.ts",
      ),
    ).toBe("label-panels");
    expect(
      classifyMermaidAnnotatedPanelCluster(
        "src/rendering-util/rendering-elements/shapes/subroutine.ts",
      ),
    ).toBeNull();
  });
});

describe("classifyMermaidHeaderPanelVariant", () => {
  it("maps header-panels onto stable header-panel variants", () => {
    expect(
      classifyMermaidHeaderPanelVariant(
        "src/rendering-util/rendering-elements/shapes/rectWithTitle.ts",
      ),
    ).toBe("rect-with-title");
    expect(
      classifyMermaidHeaderPanelVariant(
        "src/rendering-util/rendering-elements/shapes/taggedRect.ts",
      ),
    ).toBe("tagged-rect");
    expect(
      classifyMermaidHeaderPanelVariant(
        "src/rendering-util/rendering-elements/shapes/windowPane.ts",
      ),
    ).toBe("window-pane");
    expect(
      classifyMermaidHeaderPanelVariant("src/rendering-util/rendering-elements/shapes/note.ts"),
    ).toBeNull();
  });
});

describe("classifyMermaidNoteCardVariant", () => {
  it("maps note-cards onto stable note-card variants", () => {
    expect(
      classifyMermaidNoteCardVariant("src/rendering-util/rendering-elements/shapes/note.ts"),
    ).toBe("note-surface");
    expect(
      classifyMermaidNoteCardVariant("src/rendering-util/rendering-elements/shapes/card.ts"),
    ).toBe("card-surface");
    expect(
      classifyMermaidNoteCardVariant("src/rendering-util/rendering-elements/shapes/labelRect.ts"),
    ).toBeNull();
  });
});

describe("mermaid bundle attribution helpers", () => {
  it("collects matching assets and source-map byte breakdown for target packages", async () => {
    const distDir = await mkdtemp(path.join(tmpdir(), "wendao-frontend-mermaid-attribution-"));
    tempDirs.push(distDir);

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/flow.mjs",
          "/tmp/node_modules/.pnpm/beautiful-mermaid@1.1.3/node_modules/beautiful-mermaid/dist/index.js",
          "/tmp/node_modules/.pnpm/react@19.2.3/node_modules/react/index.js",
        ],
        sourcesContent: ["graph LR\nA-->B", "export const render = true;", "export default {};"],
      }),
      "utf8",
    );

    await writeFile(path.join(distDir, "vendors.js"), "console.log('vendors');", "utf8");
    await writeFile(
      path.join(distDir, "vendors.js.map"),
      JSON.stringify({
        version: 3,
        sources: ["/tmp/node_modules/.pnpm/react@19.2.3/node_modules/react/index.js"],
        sourcesContent: ["export default {};"],
      }),
      "utf8",
    );

    const packageNames = ["mermaid", "beautiful-mermaid"];
    const assets = await collectJavaScriptSourceMapPackageAssets({ distDir, packageNames });
    const packageBreakdown = await collectJavaScriptSourceMapPackageByteBreakdown({
      distDir,
      packageNames,
    });
    const familyBreakdown = await collectMermaidSourceMapModuleFamilyByteBreakdown({ distDir });
    const sharedRuntimeBreakdown = await collectMermaidSourceMapSharedRuntimeByteBreakdown({
      distDir,
    });
    const sharedChunkCapabilityBreakdown =
      await collectMermaidSourceMapSharedChunkCapabilityByteBreakdown({
        distDir,
      });
    const grammarParserBreakdown = await collectMermaidSourceMapGrammarParserByteBreakdown({
      distDir,
    });
    const diagramApiConfigBreakdown = await collectMermaidSourceMapDiagramApiConfigByteBreakdown({
      distDir,
    });
    const themePresetBreakdown = await collectMermaidSourceMapThemePresetByteBreakdown({
      distDir,
    });
    const shapePrimitiveBreakdown = await collectMermaidSourceMapShapePrimitiveByteBreakdown({
      distDir,
    });
    const baseGeometricBreakdown = await collectMermaidSourceMapBaseGeometricByteBreakdown({
      distDir,
    });
    const diagramSpecializedBreakdown =
      await collectMermaidSourceMapDiagramSpecializedByteBreakdown({
        distDir,
      });
    const rectilinearPanelBreakdown = await collectMermaidSourceMapRectilinearPanelByteBreakdown({
      distDir,
    });

    expect(assets).toEqual(["vendors-async-misc.js"]);
    expect(packageBreakdown).toEqual([
      { packageName: "beautiful-mermaid", bytes: 27 },
      { packageName: "mermaid", bytes: 14 },
    ]);
    expect(familyBreakdown).toEqual([{ familyName: "flow", bytes: 14 }]);
    expect(sharedRuntimeBreakdown).toEqual([]);
    expect(sharedChunkCapabilityBreakdown).toEqual([]);
    expect(grammarParserBreakdown).toEqual([]);
    expect(diagramApiConfigBreakdown).toEqual([]);
    expect(themePresetBreakdown).toEqual([]);
    expect(shapePrimitiveBreakdown).toEqual([]);
    expect(baseGeometricBreakdown).toEqual([]);
    expect(diagramSpecializedBreakdown).toEqual([]);
    expect(rectilinearPanelBreakdown).toEqual([]);
  });

  it("splits bundled diagram-api/config chunks into section-level byte segments", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-diagram-api-"),
    );
    tempDirs.push(distDir);
    const preamble = "const __bundled = true;\n";
    const typeDetectionSegment = `${[
      "// src/diagram-api/detectType.ts",
      "export const detectType = 'flowchart';",
    ].join("\n")}\n`;
    const themePresetSegment = `${[
      "// src/themes/theme-default.js",
      "export const themeDefault = true;",
    ].join("\n")}\n`;
    const runtimeConfigSegment = `${["// src/config.ts", "export const runtimeConfig = {};"].join(
      "\n",
    )}\n`;
    const diagramApiCoreSegment = [
      "// src/diagram-api/diagramAPI.ts",
      "export const diagramApi = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-ICPOFSXX.mjs",
        ],
        sourcesContent: [
          `${preamble}${typeDetectionSegment}${themePresetSegment}${runtimeConfigSegment}${diagramApiCoreSegment}`,
        ],
      }),
      "utf8",
    );

    const diagramApiConfigBreakdown = await collectMermaidSourceMapDiagramApiConfigByteBreakdown({
      distDir,
    });
    const themePresetBreakdown = await collectMermaidSourceMapThemePresetByteBreakdown({
      distDir,
    });

    expect(diagramApiConfigBreakdown).toEqual(
      [
        { segmentName: "runtime-config", bytes: Buffer.byteLength(runtimeConfigSegment, "utf8") },
        { segmentName: "type-detection", bytes: Buffer.byteLength(typeDetectionSegment, "utf8") },
        { segmentName: "theme-presets", bytes: Buffer.byteLength(themePresetSegment, "utf8") },
        {
          segmentName: "diagram-api-core",
          bytes: Buffer.byteLength(diagramApiCoreSegment, "utf8"),
        },
        { segmentName: "other-diagram-api-config", bytes: Buffer.byteLength(preamble, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.segmentName.localeCompare(right.segmentName),
      ),
    );
    expect(themePresetBreakdown).toEqual([
      { themeName: "default", bytes: Buffer.byteLength(themePresetSegment, "utf8") },
    ]);
  });

  it("splits theme-presets into individual theme variants", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-theme-presets-"),
    );
    tempDirs.push(distDir);
    const themeDefaultSegment = `${[
      "// src/themes/theme-default.js",
      "export const themeDefault = true;",
    ].join("\n")}\n`;
    const themeDarkSegment = `${[
      "// src/themes/theme-dark.js",
      "export const themeDark = true;",
    ].join("\n")}\n`;
    const themeReduxDarkSegment = [
      "// src/themes/theme-redux-dark.js",
      "export const themeReduxDark = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-ICPOFSXX.mjs",
        ],
        sourcesContent: [`${themeDefaultSegment}${themeDarkSegment}${themeReduxDarkSegment}`],
      }),
      "utf8",
    );

    const themePresetBreakdown = await collectMermaidSourceMapThemePresetByteBreakdown({
      distDir,
    });

    expect(themePresetBreakdown).toEqual(
      [
        { themeName: "redux-dark", bytes: Buffer.byteLength(themeReduxDarkSegment, "utf8") },
        { themeName: "default", bytes: Buffer.byteLength(themeDefaultSegment, "utf8") },
        { themeName: "dark", bytes: Buffer.byteLength(themeDarkSegment, "utf8") },
      ].toSorted(
        (left, right) => right.bytes - left.bytes || left.themeName.localeCompare(right.themeName),
      ),
    );
  });

  it("splits shape-primitives into stable family buckets", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-shape-primitives-"),
    );
    tempDirs.push(distDir);
    const preamble = "const __shape = true;\n";
    const circleSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/circle.ts",
      "export const circle = true;",
    ].join("\n")}\n`;
    const classBoxSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/classBox.ts",
      "export const classBox = true;",
    ].join("\n")}\n`;
    const iconSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/icon.ts",
      "export const icon = true;",
    ].join("\n")}\n`;
    const stateSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/stateEnd.ts",
      "export const stateEnd = true;",
    ].join("\n")}\n`;
    const infraSegment = `${[
      "// src/rendering-util/rendering-elements/intersect/intersect-rect.js",
      "export const intersectRect = true;",
    ].join("\n")}\n`;
    const clusterSegment = [
      "// src/rendering-util/rendering-elements/clusters.js",
      "export const clusters = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [
          `${preamble}${circleSegment}${classBoxSegment}${iconSegment}${stateSegment}${infraSegment}${clusterSegment}`,
        ],
      }),
      "utf8",
    );

    const shapePrimitiveBreakdown = await collectMermaidSourceMapShapePrimitiveByteBreakdown({
      distDir,
    });

    expect(shapePrimitiveBreakdown).toEqual(
      [
        { familyName: "shape-infra", bytes: Buffer.byteLength(infraSegment, "utf8") },
        { familyName: "diagram-specialized", bytes: Buffer.byteLength(classBoxSegment, "utf8") },
        { familyName: "base-geometric", bytes: Buffer.byteLength(circleSegment, "utf8") },
        { familyName: "icon-media", bytes: Buffer.byteLength(iconSegment, "utf8") },
        { familyName: "clusters", bytes: Buffer.byteLength(clusterSegment, "utf8") },
        { familyName: "state-family", bytes: Buffer.byteLength(stateSegment, "utf8") },
        { familyName: "other-shape-primitives", bytes: Buffer.byteLength(preamble, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.familyName.localeCompare(right.familyName),
      ),
    );
  });

  it("splits base geometric shapes into stable cluster buckets", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-base-geometric-"),
    );
    tempDirs.push(distDir);
    const circleSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/circle.ts",
      "export const circle = true;",
    ].join("\n")}\n`;
    const rectSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/rectWithTitle.ts",
      "export const rectWithTitle = true;",
    ].join("\n")}\n`;
    const polygonSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/triangle.ts",
      "export const triangle = true;",
    ].join("\n")}\n`;
    const braceSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/curlyBraces.ts",
      "export const curlyBraces = true;",
    ].join("\n")}\n`;
    const waveSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/cylinder.ts",
      "export const cylinder = true;",
    ].join("\n")}\n`;
    const connectorSegment = [
      "// src/rendering-util/rendering-elements/shapes/forkJoin.ts",
      "export const forkJoin = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [
          `${circleSegment}${rectSegment}${polygonSegment}${braceSegment}${waveSegment}${connectorSegment}`,
        ],
      }),
      "utf8",
    );

    const baseGeometricBreakdown = await collectMermaidSourceMapBaseGeometricByteBreakdown({
      distDir,
    });

    expect(baseGeometricBreakdown).toEqual(
      [
        { clusterName: "rectilinear-panels", bytes: Buffer.byteLength(rectSegment, "utf8") },
        {
          clusterName: "directional-connectors",
          bytes: Buffer.byteLength(connectorSegment, "utf8"),
        },
        { clusterName: "polygonal-symbolic", bytes: Buffer.byteLength(polygonSegment, "utf8") },
        { clusterName: "cylindrical-wave", bytes: Buffer.byteLength(waveSegment, "utf8") },
        { clusterName: "curves-braces", bytes: Buffer.byteLength(braceSegment, "utf8") },
        { clusterName: "circular", bytes: Buffer.byteLength(circleSegment, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits diagram-specialized shapes into stable domain clusters", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-diagram-specialized-"),
    );
    tempDirs.push(distDir);
    const erBoxSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/erBox.ts",
      "export const erBox = true;",
    ].join("\n")}\n`;
    const classSupportSegment = `${[
      "// src/diagrams/class/shapeUtil.ts",
      "export const classShapeUtil = true;",
    ].join("\n")}\n`;
    const mindmapSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/defaultMindmapNode.ts",
      "export const defaultMindmapNode = true;",
    ].join("\n")}\n`;
    const calloutSegment = [
      "// src/rendering-util/rendering-elements/shapes/bang.ts",
      "export const bang = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [`${erBoxSegment}${classSupportSegment}${mindmapSegment}${calloutSegment}`],
      }),
      "utf8",
    );

    const diagramSpecializedBreakdown =
      await collectMermaidSourceMapDiagramSpecializedByteBreakdown({
        distDir,
      });

    expect(diagramSpecializedBreakdown).toEqual(
      [
        {
          clusterName: "box-diagrams",
          bytes:
            Buffer.byteLength(erBoxSegment, "utf8") +
            Buffer.byteLength(classSupportSegment, "utf8"),
        },
        { clusterName: "boards-and-mindmaps", bytes: Buffer.byteLength(mindmapSegment, "utf8") },
        { clusterName: "callout-symbols", bytes: Buffer.byteLength(calloutSegment, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits box-diagrams into stable box clusters", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-box-diagrams-"),
    );
    tempDirs.push(distDir);
    const erBoxSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/erBox.ts",
      "export const erBox = true;",
    ].join("\n")}\n`;
    const classBoxSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/classBox.ts",
      "export const classBox = true;",
    ].join("\n")}\n`;
    const classSupportSegment = `${[
      "// src/diagrams/class/shapeUtil.ts",
      "export const classShapeUtil = true;",
    ].join("\n")}\n`;
    const requirementBoxSegment = [
      "// src/rendering-util/rendering-elements/shapes/requirementBox.ts",
      "export const requirementBox = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [
          `${erBoxSegment}${classBoxSegment}${classSupportSegment}${requirementBoxSegment}`,
        ],
      }),
      "utf8",
    );

    const boxDiagramBreakdown = await collectMermaidSourceMapBoxDiagramByteBreakdown({
      distDir,
    });

    expect(boxDiagramBreakdown).toEqual(
      [
        {
          clusterName: "class-boxes",
          bytes:
            Buffer.byteLength(classBoxSegment, "utf8") +
            Buffer.byteLength(classSupportSegment, "utf8"),
        },
        { clusterName: "er-boxes", bytes: Buffer.byteLength(erBoxSegment, "utf8") },
        {
          clusterName: "requirement-boxes",
          bytes: Buffer.byteLength(requirementBoxSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits class-boxes into shape and support clusters", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-class-boxes-"),
    );
    tempDirs.push(distDir);
    const classBoxSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/classBox.ts",
      "export const classBox = true;",
    ].join("\n")}\n`;
    const classSupportSegment = [
      "// src/diagrams/class/shapeUtil.ts",
      "export const classShapeUtil = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [`${classBoxSegment}${classSupportSegment}`],
      }),
      "utf8",
    );

    const classBoxBreakdown = await collectMermaidSourceMapClassBoxByteBreakdown({
      distDir,
    });

    expect(classBoxBreakdown).toEqual(
      [
        { clusterName: "class-box-shape", bytes: Buffer.byteLength(classBoxSegment, "utf8") },
        {
          clusterName: "class-shape-support",
          bytes: Buffer.byteLength(classSupportSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits rectilinear panels into stable panel clusters", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-rectilinear-panels-"),
    );
    tempDirs.push(distDir);
    const rectSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/rectWithTitle.ts",
      "export const rectWithTitle = true;",
    ].join("\n")}\n`;
    const noteSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/note.ts",
      "export const note = true;",
    ].join("\n")}\n`;
    const workflowSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/subroutine.ts",
      "export const subroutine = true;",
    ].join("\n")}\n`;
    const angledSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/bowTieRect.ts",
      "export const bowTieRect = true;",
    ].join("\n")}\n`;
    const basicSegment = [
      "// src/rendering-util/rendering-elements/shapes/roundedRect.ts",
      "export const roundedRect = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [
          `${rectSegment}${noteSegment}${workflowSegment}${angledSegment}${basicSegment}`,
        ],
      }),
      "utf8",
    );

    const rectilinearPanelBreakdown = await collectMermaidSourceMapRectilinearPanelByteBreakdown({
      distDir,
    });

    expect(rectilinearPanelBreakdown).toEqual(
      [
        {
          clusterName: "annotated-panels",
          bytes: Buffer.byteLength(rectSegment, "utf8") + Buffer.byteLength(noteSegment, "utf8"),
        },
        { clusterName: "angled-panels", bytes: Buffer.byteLength(angledSegment, "utf8") },
        { clusterName: "workflow-panels", bytes: Buffer.byteLength(workflowSegment, "utf8") },
        { clusterName: "basic-rects", bytes: Buffer.byteLength(basicSegment, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits annotated-panels into stable annotated-panel clusters", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-annotated-panels-"),
    );
    tempDirs.push(distDir);
    const rectSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/rectWithTitle.ts",
      "export const rectWithTitle = true;",
    ].join("\n")}\n`;
    const taggedSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/taggedRect.ts",
      "export const taggedRect = true;",
    ].join("\n")}\n`;
    const windowSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/windowPane.ts",
      "export const windowPane = true;",
    ].join("\n")}\n`;
    const noteSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/note.ts",
      "export const note = true;",
    ].join("\n")}\n`;
    const cardSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/card.ts",
      "export const card = true;",
    ].join("\n")}\n`;
    const labelSegment = [
      "// src/rendering-util/rendering-elements/shapes/labelRect.ts",
      "export const labelRect = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [
          `${rectSegment}${taggedSegment}${windowSegment}${noteSegment}${cardSegment}${labelSegment}`,
        ],
      }),
      "utf8",
    );

    const annotatedPanelBreakdown = await collectMermaidSourceMapAnnotatedPanelByteBreakdown({
      distDir,
    });

    expect(annotatedPanelBreakdown).toEqual(
      [
        {
          clusterName: "header-panels",
          bytes:
            Buffer.byteLength(rectSegment, "utf8") +
            Buffer.byteLength(taggedSegment, "utf8") +
            Buffer.byteLength(windowSegment, "utf8"),
        },
        {
          clusterName: "note-cards",
          bytes: Buffer.byteLength(noteSegment, "utf8") + Buffer.byteLength(cardSegment, "utf8"),
        },
        { clusterName: "label-panels", bytes: Buffer.byteLength(labelSegment, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits header-panels into stable header-panel variants", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-header-panels-"),
    );
    tempDirs.push(distDir);
    const rectSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/rectWithTitle.ts",
      "export const rectWithTitle = true;",
    ].join("\n")}\n`;
    const taggedSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/taggedRect.ts",
      "export const taggedRect = true;",
    ].join("\n")}\n`;
    const windowSegment = [
      "// src/rendering-util/rendering-elements/shapes/windowPane.ts",
      "export const windowPane = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [`${rectSegment}${taggedSegment}${windowSegment}`],
      }),
      "utf8",
    );

    const headerPanelBreakdown = await collectMermaidSourceMapHeaderPanelByteBreakdown({
      distDir,
    });

    expect(headerPanelBreakdown).toEqual(
      [
        {
          clusterName: "rect-with-title",
          bytes: Buffer.byteLength(rectSegment, "utf8"),
        },
        {
          clusterName: "tagged-rect",
          bytes: Buffer.byteLength(taggedSegment, "utf8"),
        },
        {
          clusterName: "window-pane",
          bytes: Buffer.byteLength(windowSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits note-cards into stable note-card variants", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-note-cards-"),
    );
    tempDirs.push(distDir);
    const noteSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/note.ts",
      "export const note = true;",
    ].join("\n")}\n`;
    const cardSegment = [
      "// src/rendering-util/rendering-elements/shapes/card.ts",
      "export const card = true;",
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [`${noteSegment}${cardSegment}`],
      }),
      "utf8",
    );

    const noteCardBreakdown = await collectMermaidSourceMapNoteCardByteBreakdown({
      distDir,
    });

    expect(noteCardBreakdown).toEqual(
      [
        {
          clusterName: "note-surface",
          bytes: Buffer.byteLength(noteSegment, "utf8"),
        },
        {
          clusterName: "card-surface",
          bytes: Buffer.byteLength(cardSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits er-boxes into stable source sections", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-er-boxes-"),
    );
    tempDirs.push(distDir);
    const erPrelude = `${[
      "// src/rendering-util/rendering-elements/shapes/erBox.ts",
      'import rough54 from "roughjs";',
      "var COLOR_THEMES = /* @__PURE__ */ new Set(['redux-color']);",
    ].join("\n")}\n`;
    const erMain = `${[
      "async function erBox(parent, node) {",
      "  return node;",
      "}",
      '__name(erBox, "erBox");',
    ].join("\n")}\n`;
    const addTextSegment = `${[
      "async function addText(shapeSvg, labelText, config) {",
      "  return shapeSvg;",
      "}",
      '__name(addText, "addText");',
    ].join("\n")}\n`;
    const lineSegment = [
      "function lineToPolygon(x1, y1, x2, y2, thickness) {",
      "  return [];",
      "}",
      '__name(lineToPolygon, "lineToPolygon");',
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [`${erPrelude}${erMain}${addTextSegment}${lineSegment}`],
      }),
      "utf8",
    );

    const erBoxBreakdown = await collectMermaidSourceMapErBoxByteBreakdown({
      distDir,
    });

    expect(erBoxBreakdown).toEqual(
      [
        { clusterName: "entity-renderer", bytes: Buffer.byteLength(erMain, "utf8") },
        { clusterName: "text-helper", bytes: Buffer.byteLength(addTextSegment, "utf8") },
        { clusterName: "line-helper", bytes: Buffer.byteLength(lineSegment, "utf8") },
        { clusterName: "theme-scaffolding", bytes: Buffer.byteLength(erPrelude, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits the er entity renderer into setup and rendering paths", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-er-renderer-"),
    );
    tempDirs.push(distDir);
    const erPrelude = `${[
      "// src/rendering-util/rendering-elements/shapes/erBox.ts",
      'import rough54 from "roughjs";',
      "var COLOR_THEMES = /* @__PURE__ */ new Set(['redux-color']);",
    ].join("\n")}\n`;
    const erSetupSegment = `${[
      "async function erBox(parent, node) {",
      "  const entityNode = node;",
      "  const config = getConfig();",
    ].join("\n")}\n`;
    const erLabelOnlySegment = `${[
      "if (entityNode.attributes.length === 0 && node.label) {",
      "  return node;",
      "}",
    ].join("\n")}\n`;
    const erAttributeTableSegment = `${[
      "if (!config.htmlLabels) {",
      "  return parent;",
      "}",
      "}",
      '__name(erBox, "erBox");',
    ].join("\n")}\n`;
    const addTextSegment = `${[
      "async function addText(shapeSvg, labelText, config) {",
      "  return shapeSvg;",
      "}",
      '__name(addText, "addText");',
    ].join("\n")}\n`;
    const lineSegment = [
      "function lineToPolygon(x1, y1, x2, y2, thickness) {",
      "  return [];",
      "}",
      '__name(lineToPolygon, "lineToPolygon");',
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [
          `${erPrelude}${erSetupSegment}${erLabelOnlySegment}${erAttributeTableSegment}${addTextSegment}${lineSegment}`,
        ],
      }),
      "utf8",
    );

    const erEntityRendererBreakdown = await collectMermaidSourceMapErEntityRendererByteBreakdown({
      distDir,
    });

    expect(erEntityRendererBreakdown).toEqual(
      [
        {
          clusterName: "attribute-table-path",
          bytes: Buffer.byteLength(erAttributeTableSegment, "utf8"),
        },
        {
          clusterName: "renderer-setup",
          bytes: Buffer.byteLength(erSetupSegment, "utf8"),
        },
        {
          clusterName: "label-only-path",
          bytes: Buffer.byteLength(erLabelOnlySegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits the er attribute table path into stable rendering segments", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-er-attribute-table-"),
    );
    tempDirs.push(distDir);
    const erPrelude = `${[
      "// src/rendering-util/rendering-elements/shapes/erBox.ts",
      'import rough54 from "roughjs";',
      "var COLOR_THEMES = /* @__PURE__ */ new Set(['redux-color']);",
    ].join("\n")}\n`;
    const erSetupSegment = `${[
      "async function erBox(parent, node) {",
      "  const entityNode = node;",
      "  const config = getConfig();",
    ].join("\n")}\n`;
    const erLabelOnlySegment = `${[
      "if (entityNode.attributes.length === 0 && node.label) {",
      "  return node;",
      "}",
    ].join("\n")}\n`;
    const erTableBootstrapSegment = `${[
      "if (!config.htmlLabels) {",
      "  PADDING *= 1.25;",
      "}",
    ].join("\n")}\n`;
    const erRowMeasurementSegment = `${[
      "for (const attribute of entityNode.attributes) {",
      "  rows.push(attribute);",
      "}",
    ].join("\n")}\n`;
    const erWidthNormalizationSegment = `${[
      "if (nameBBox.width + PADDING * 2 - (maxTypeWidth + maxNameWidth + maxKeysWidth + maxCommentWidth) > 0) {",
      "  maxTypeWidth += 1;",
      "}",
    ].join("\n")}\n`;
    const erSvgRenderingSegment = `${[
      'shapeSvg.selectAll("g:not(:first-child)").each((_, i, nodes) => {',
      "  return nodes[i];",
      "});",
      "}",
      '__name(erBox, "erBox");',
    ].join("\n")}\n`;
    const addTextSegment = `${[
      "async function addText(shapeSvg, labelText, config) {",
      "  return shapeSvg;",
      "}",
      '__name(addText, "addText");',
    ].join("\n")}\n`;
    const lineSegment = [
      "function lineToPolygon(x1, y1, x2, y2, thickness) {",
      "  return [];",
      "}",
      '__name(lineToPolygon, "lineToPolygon");',
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [
          `${erPrelude}${erSetupSegment}${erLabelOnlySegment}${erTableBootstrapSegment}${erRowMeasurementSegment}${erWidthNormalizationSegment}${erSvgRenderingSegment}${addTextSegment}${lineSegment}`,
        ],
      }),
      "utf8",
    );

    const erAttributeTableBreakdown = await collectMermaidSourceMapErAttributeTableByteBreakdown({
      distDir,
    });

    expect(erAttributeTableBreakdown).toEqual(
      [
        {
          clusterName: "column-width-normalization",
          bytes: Buffer.byteLength(erWidthNormalizationSegment, "utf8"),
        },
        {
          clusterName: "svg-row-rendering",
          bytes: Buffer.byteLength(erSvgRenderingSegment, "utf8"),
        },
        {
          clusterName: "attribute-row-measurement",
          bytes: Buffer.byteLength(erRowMeasurementSegment, "utf8"),
        },
        {
          clusterName: "table-bootstrap",
          bytes: Buffer.byteLength(erTableBootstrapSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });

  it("splits the er svg row rendering path into stable rendering clusters", async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), "wendao-frontend-mermaid-attribution-er-svg-row-rendering-"),
    );
    tempDirs.push(distDir);
    const erPrelude = `${[
      "// src/rendering-util/rendering-elements/shapes/erBox.ts",
      'import rough54 from "roughjs";',
      "var COLOR_THEMES = /* @__PURE__ */ new Set(['redux-color']);",
    ].join("\n")}\n`;
    const erSetupSegment = `${[
      "async function erBox(parent, node) {",
      "  const entityNode = node;",
      "  const config = getConfig();",
    ].join("\n")}\n`;
    const erLabelOnlySegment = `${[
      "if (entityNode.attributes.length === 0 && node.label) {",
      "  return node;",
      "}",
    ].join("\n")}\n`;
    const erTableBootstrapSegment = `${[
      "if (!config.htmlLabels) {",
      "  PADDING *= 1.25;",
      "}",
    ].join("\n")}\n`;
    const erRowMeasurementSegment = `${[
      "for (const attribute of entityNode.attributes) {",
      "  rows.push(attribute);",
      "}",
    ].join("\n")}\n`;
    const erWidthNormalizationSegment = `${[
      "if (nameBBox.width + PADDING * 2 - (maxTypeWidth + maxNameWidth + maxKeysWidth + maxCommentWidth) > 0) {",
      "  maxTypeWidth += 1;",
      "}",
    ].join("\n")}\n`;
    const erSvgTextRepositioningSegment = `${[
      'shapeSvg.selectAll("g:not(:first-child)").each((_, i, nodes) => {',
      "  const text2 = select4(nodes[i]);",
      '  text2.attr("transform", "translate(0, 0)");',
      "});",
    ].join("\n")}\n`;
    const erSvgNameThemeSegment = `${[
      'shapeSvg.select(".name").attr("transform", "translate(0, 0)");',
      "if (theme != null && COLOR_THEMES.has(theme)) {",
      '  shapeSvg.attr("data-color-id", "color-0");',
      "}",
    ].join("\n")}\n`;
    const erSvgRowSurfaceSegment = `${[
      "const roughRect = rc.rectangle(x, y, w, h, options);",
      'const rect2 = shapeSvg.insert(() => roughRect, ":first-child");',
      "for (const [i, row] of rows.entries()) {",
      '  shapeSvg.insert(() => row, "g.label");',
      "}",
    ].join("\n")}\n`;
    const erSvgDividerSegment = `${[
      "const thickness = 1e-4;",
      "let points = lineToPolygon(x, y, w, h, thickness);",
      'shapeSvg.insert(() => points).attr("class", "divider");',
      "if (keysPresent) {",
      "  points = lineToPolygon(x, y, w, h, thickness);",
      "}",
      "if (commentPresent) {",
      "  points = lineToPolygon(x, y, w, h, thickness);",
      "}",
    ].join("\n")}\n`;
    const erSvgFinalizationSegment = `${[
      "updateNodeBounds(node, rect2);",
      'if (nodeStyles && node.look !== "handDrawn") {',
      '  shapeSvg.selectAll("path").attr("style", nodeStyles);',
      "}",
      "node.intersect = function(point) {",
      "  return point;",
      "};",
      "return shapeSvg;",
      "}",
      '__name(erBox, "erBox");',
    ].join("\n")}\n`;
    const erSvgRenderingSegment = `${erSvgTextRepositioningSegment}${erSvgNameThemeSegment}${erSvgRowSurfaceSegment}${erSvgDividerSegment}${erSvgFinalizationSegment}`;
    const addTextSegment = `${[
      "async function addText(shapeSvg, labelText, config) {",
      "  return shapeSvg;",
      "}",
      '__name(addText, "addText");',
    ].join("\n")}\n`;
    const lineSegment = [
      "function lineToPolygon(x1, y1, x2, y2, thickness) {",
      "  return [];",
      "}",
      '__name(lineToPolygon, "lineToPolygon");',
    ].join("\n");

    await writeFile(path.join(distDir, "vendors-async-misc.js"), "console.log('misc');", "utf8");
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
        ],
        sourcesContent: [
          `${erPrelude}${erSetupSegment}${erLabelOnlySegment}${erTableBootstrapSegment}${erRowMeasurementSegment}${erWidthNormalizationSegment}${erSvgRenderingSegment}${addTextSegment}${lineSegment}`,
        ],
      }),
      "utf8",
    );

    const erSvgRowRenderingBreakdown = await collectMermaidSourceMapErSvgRowRenderingByteBreakdown({
      distDir,
    });

    expect(erSvgRowRenderingBreakdown).toEqual(
      [
        {
          clusterName: "divider-drawing",
          bytes: Buffer.byteLength(erSvgDividerSegment, "utf8"),
        },
        {
          clusterName: "attribute-text-repositioning",
          bytes: Buffer.byteLength(erSvgTextRepositioningSegment, "utf8"),
        },
        {
          clusterName: "row-surface-drawing",
          bytes: Buffer.byteLength(erSvgRowSurfaceSegment, "utf8"),
        },
        {
          clusterName: "style-bounds-finalization",
          bytes: Buffer.byteLength(erSvgFinalizationSegment, "utf8"),
        },
        {
          clusterName: "name-and-theme-tagging",
          bytes: Buffer.byteLength(erSvgNameThemeSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
  });
});
