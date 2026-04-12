import type { CodeAstLanguageAnatomyDeriver } from "./types";
import { attributeValue, buildBooleanFacet, buildFacet, compactFacets } from "./shared";

function buildJuliaSharedFacets(
  atom: Parameters<CodeAstLanguageAnatomyDeriver["buildDeclarationFacets"]>[0],
) {
  return compactFacets([
    buildFacet("binding", attributeValue(atom, "binding_kind")),
    buildFacet("type", attributeValue(atom, "type_kind")),
    buildFacet("parameter", attributeValue(atom, "parameter_kind")),
    buildFacet("return", attributeValue(atom, "function_return_type")),
    buildBooleanFacet("scope", attributeValue(atom, "top_level") === "true", "top-level"),
    buildFacet("owner", attributeValue(atom, "owner_path")),
  ]);
}

export const juliaCodeAstLanguageAnatomyDeriver: CodeAstLanguageAnatomyDeriver = {
  buildDeclarationFacets(atom) {
    return buildJuliaSharedFacets(atom);
  },
  buildBlockFacets(atom) {
    return compactFacets([
      buildFacet("return", attributeValue(atom, "function_return_type")),
      buildFacet("owner", attributeValue(atom, "owner_path")),
    ]);
  },
  buildSymbolFacets(atom) {
    return buildJuliaSharedFacets(atom);
  },
};
