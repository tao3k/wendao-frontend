import { describe, expect, it } from "vitest";
import type { CodeAstAnalysisResponse } from "../../../../api";
import { deriveLanguageStructuredProjection, resolveStructuredProjectionLanguage } from "./index";

describe("structured dashboard language projections", () => {
  it("routes Julia AST projections through the Julia language module", () => {
    const projection = deriveLanguageStructuredProjection({
      language: null,
      path: "solver/src/CodeAstJulia.jl",
      content: ["function solve(x)", "  x + 1", "end"].join("\n"),
      analysis: {
        repoId: "solver",
        path: "solver/src/CodeAstJulia.jl",
        language: "julia",
        nodeCount: 1,
        edgeCount: 0,
        nodes: [
          {
            id: "fn:solve",
            label: "solve",
            kind: "symbol",
            path: "solver/src/CodeAstJulia.jl",
            lineStart: 1,
            lineEnd: 3,
          },
        ],
        edges: [],
        projections: [],
        diagnostics: [],
        retrievalAtoms: [
          {
            ownerId: "module:Solver",
            surface: "declaration",
            chunkId: "ast:julia:solver:module",
            semanticType: "module",
            fingerprint: "fp:julia:module",
            tokenEstimate: 5,
            displayLabel: "Declaration Rail · Solver",
            excerpt: "module Solver",
            lineStart: 1,
            lineEnd: 1,
          },
          {
            ownerId: "fn:solve",
            surface: "declaration",
            chunkId: "ast:julia:solve:decl",
            semanticType: "function",
            fingerprint: "fp:julia:solve",
            tokenEstimate: 9,
            displayLabel: "Declaration Rail · solve",
            excerpt: "function solve(x)\n  x + 1\nend",
            lineStart: 1,
            lineEnd: 3,
            attributes: [
              ["function_return_type", "Processed"],
              ["owner_path", "Solver.solve"],
              ["top_level", "true"],
            ],
          },
        ],
      } satisfies CodeAstAnalysisResponse,
    });

    expect(resolveStructuredProjectionLanguage(null, "solver/src/CodeAstJulia.jl")).toBe("julia");
    expect(projection.outline[0]).toMatchObject({
      label: "module",
      value: "Declaration Rail · Solver",
    });
    expect(projection.outline[1]).toMatchObject({
      label: "function",
      value: "Declaration Rail · solve",
    });
    expect(projection.fragments[1]).toMatchObject({
      label: "Declaration Rail · solve",
      detail: "function · julia · L1-L3 · Processed · top-level · owner=Solver.solve",
      language: "julia",
      semanticType: "function",
    });
    expect(projection.saliencyExcerpt).toContain("function solve");
  });

  it("routes Modelica AST projections through the Modelica language module", () => {
    const projection = deriveLanguageStructuredProjection({
      language: "modelica",
      path: "mcl/Modelica/Blocks/package.mo",
      content: ["model PI", "  parameter Real k = 1;", "equation", "  y = k;", "end PI;"].join(
        "\n",
      ),
      analysis: {
        repoId: "mcl",
        path: "mcl/Modelica/Blocks/package.mo",
        language: "modelica",
        nodeCount: 1,
        edgeCount: 0,
        nodes: [
          {
            id: "model:PI",
            label: "PI",
            kind: "symbol",
            path: "mcl/Modelica/Blocks/package.mo",
            lineStart: 1,
            lineEnd: 5,
          },
        ],
        edges: [],
        projections: [],
        diagnostics: [],
        retrievalAtoms: [
          {
            ownerId: "model:PI",
            surface: "declaration",
            chunkId: "ast:modelica:pi:decl",
            semanticType: "model",
            fingerprint: "fp:modelica:pi",
            tokenEstimate: 11,
            displayLabel: "Declaration Rail · PI",
            excerpt: "model PI\n  parameter Real k = 1;\nequation\n  y = k;\nend PI;",
            lineStart: 1,
            lineEnd: 5,
            attributes: [
              ["class_name", "PI"],
              ["restriction", "model"],
              ["equation_latex", "y = k;"],
            ],
          },
          {
            ownerId: "symbol:k",
            surface: "symbol",
            chunkId: "ast:modelica:k:symbol",
            semanticType: "parameter",
            fingerprint: "fp:modelica:k",
            tokenEstimate: 4,
            displayLabel: "Symbol Rail · k",
            excerpt: "k",
            lineStart: 2,
            lineEnd: 2,
            attributes: [
              ["visibility", "public"],
              ["variability", "parameter"],
              ["type_name", "Real"],
              ["owner_name", "PI"],
              ["owner_path", "PI"],
            ],
          },
        ],
      } satisfies CodeAstAnalysisResponse,
    });

    expect(resolveStructuredProjectionLanguage("modelica", "mcl/Modelica/Blocks/package.mo")).toBe(
      "modelica",
    );
    expect(projection.outline[0]).toMatchObject({
      label: "model",
      value: "Declaration Rail · PI",
    });
    expect(projection.outline[1]).toMatchObject({
      label: "parameter",
      value: "Symbol Rail · k",
    });
    expect(projection.fragments.map((fragment) => fragment.label)).toEqual([
      "Declaration Rail · PI",
      "equation · PI",
      "Symbol Rail · k",
    ]);
    expect(projection.fragments[0]?.detail).toBe("model · modelica · L1-L5");
    expect(projection.fragments[1]?.detail).toBe("equation · modelica · model");
    expect(projection.fragments[2]?.detail).toBe(
      "parameter · modelica · L2 · public · parameter · Real · owner=PI",
    );
    expect(projection.saliencyExcerpt).toContain("y = k;");
  });

  it("expands import-backed Modelica AST rails with parser-backed syntax details", () => {
    const projection = deriveLanguageStructuredProjection({
      language: "modelica",
      path: "mcl/Modelica/Blocks/package.mo",
      content: [
        "within Modelica.Blocks;",
        "package Types",
        "  import SI = Modelica.Units.SI;",
        "  import Modelica.Math;",
        "  import Math = Modelica.Math;",
        "end Types;",
      ].join("\n"),
      analysis: {
        repoId: "mcl",
        path: "mcl/Modelica/Blocks/package.mo",
        language: "modelica",
        nodeCount: 3,
        edgeCount: 0,
        nodes: [],
        edges: [],
        projections: [],
        diagnostics: [],
        retrievalAtoms: [
          {
            ownerId:
              "repo:modelica-import-live:import:repo:modelica-import-live:module:Modelica.Blocks:Modelica.Math:0",
            surface: "symbol",
            chunkId: "ast:modelica:imports:math-qualified",
            semanticType: "importModule",
            fingerprint: "fp:modelica:math-qualified",
            tokenEstimate: 6,
            displayLabel: "Import Rail · Math",
            excerpt: "Modelica.Math",
            lineStart: 4,
            lineEnd: 4,
            attributes: [
              ["import_name", "Math"],
              ["target_package", "Modelica"],
              ["source_module", "Modelica.Math"],
              ["import_kind", "symbol"],
              ["dependency_form", "qualified_import"],
              ["dependency_local_name", "Math"],
              ["dependency_target", "Modelica.Math"],
            ],
          },
          {
            ownerId:
              "repo:modelica-import-live:import:repo:modelica-import-live:module:Modelica.Blocks:Modelica.Math:1",
            surface: "symbol",
            chunkId: "ast:modelica:imports:math-unqualified",
            semanticType: "importModule",
            fingerprint: "fp:modelica:math-unqualified",
            tokenEstimate: 6,
            displayLabel: "Import Rail · Math",
            excerpt: "Modelica.Math",
            lineStart: 5,
            lineEnd: 5,
            attributes: [
              ["import_name", "Math"],
              ["target_package", "Modelica"],
              ["source_module", "Modelica.Math"],
              ["import_kind", "module"],
              ["dependency_form", "unqualified_import"],
              ["dependency_local_name", "Math"],
              ["dependency_target", "Modelica.Math"],
            ],
          },
          {
            ownerId:
              "repo:modelica-import-live:import:repo:modelica-import-live:module:Modelica.Blocks:Modelica.Units.SI:2",
            surface: "symbol",
            chunkId: "ast:modelica:imports:si-named",
            semanticType: "importModule",
            fingerprint: "fp:modelica:si-named",
            tokenEstimate: 6,
            displayLabel: "Import Rail · SI",
            excerpt: "Modelica.Units.SI",
            lineStart: 3,
            lineEnd: 3,
            attributes: [
              ["import_name", "SI"],
              ["target_package", "Modelica"],
              ["source_module", "Modelica.Units.SI"],
              ["import_kind", "module"],
              ["dependency_alias", "SI"],
              ["dependency_form", "named_import"],
              ["dependency_local_name", "SI"],
              ["dependency_target", "Modelica.Units.SI"],
            ],
          },
        ],
      } satisfies CodeAstAnalysisResponse,
    });

    expect(projection.outline).toEqual([
      {
        label: "import",
        value: "Import Rail · Math",
        query: "Modelica.Math",
        semanticType: "import",
      },
      {
        label: "import",
        value: "Import Rail · SI",
        query: "Modelica.Units.SI",
        semanticType: "import",
      },
    ]);
    expect(projection.fragments.map((fragment) => fragment.detail)).toEqual([
      "import · modelica · L4 · symbol · qualified_import · Modelica.Math · package=Modelica",
      "import · modelica · L5 · module · unqualified_import · Modelica.Math · package=Modelica",
      "import · modelica · L3 · module · named_import · alias=SI · Modelica.Units.SI · package=Modelica",
    ]);
    expect(projection.fragments.map((fragment) => fragment.query)).toEqual([
      "Modelica.Math",
      "Modelica.Math",
      "Modelica.Units.SI",
    ]);
    expect(projection.saliencyExcerpt).toBe("Modelica.Math");
  });
});
