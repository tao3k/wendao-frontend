import type { CodeAstLanguageAnatomyDeriver } from "./types";
import { buildGenericAttributeFacets } from "./shared";

export const defaultCodeAstLanguageAnatomyDeriver: CodeAstLanguageAnatomyDeriver = {
  buildDeclarationFacets(atom) {
    return buildGenericAttributeFacets(atom);
  },
  buildBlockFacets(atom) {
    return buildGenericAttributeFacets(atom, 4);
  },
  buildSymbolFacets(atom) {
    return buildGenericAttributeFacets(atom, 5);
  },
};
