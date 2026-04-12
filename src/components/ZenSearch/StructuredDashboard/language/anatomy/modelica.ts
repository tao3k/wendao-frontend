import type { CodeAstLanguageAnatomyDeriver } from "./types";
import { attributeValue, buildBooleanFacet, buildFacet, compactFacets } from "./shared";

function buildModelicaSharedFacets(
  atom: Parameters<CodeAstLanguageAnatomyDeriver["buildDeclarationFacets"]>[0],
) {
  return compactFacets([
    buildFacet("class", attributeValue(atom, "class_name")),
    buildFacet("restriction", attributeValue(atom, "restriction")),
    buildFacet("visibility", attributeValue(atom, "visibility")),
    buildFacet("variability", attributeValue(atom, "variability")),
    buildFacet("component", attributeValue(atom, "component_kind")),
    buildFacet("type", attributeValue(atom, "type_name")),
    buildFacet("direction", attributeValue(atom, "direction")),
    buildFacet("unit", attributeValue(atom, "unit"), attributeValue(atom, "unit")),
    buildBooleanFacet("scope", attributeValue(atom, "top_level") === "true", "top-level"),
    buildBooleanFacet("modifier", attributeValue(atom, "is_partial") === "true", "partial"),
    buildBooleanFacet("modifier", attributeValue(atom, "is_final") === "true", "final"),
    buildBooleanFacet(
      "modifier",
      attributeValue(atom, "is_encapsulated") === "true",
      "encapsulated",
    ),
    buildFacet("owner", attributeValue(atom, "owner_path")),
  ]);
}

export const modelicaCodeAstLanguageAnatomyDeriver: CodeAstLanguageAnatomyDeriver = {
  buildDeclarationFacets(atom) {
    return buildModelicaSharedFacets(atom);
  },
  buildBlockFacets(atom) {
    return compactFacets([
      buildFacet("restriction", attributeValue(atom, "restriction")),
      buildFacet("component", attributeValue(atom, "component_kind")),
      buildFacet("owner", attributeValue(atom, "owner_path")),
    ]);
  },
  buildSymbolFacets(atom) {
    return buildModelicaSharedFacets(atom);
  },
};
