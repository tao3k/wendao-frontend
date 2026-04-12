import type { CodeAstRetrievalAtom } from "../../codeAstRetrievalHelpers";

export interface CodeAstFacetModel {
  label: string;
  value: string;
  query?: string;
}

export interface CodeAstLanguageAnatomyDeriver {
  buildDeclarationFacets(atom: CodeAstRetrievalAtom): CodeAstFacetModel[];
  buildBlockFacets(atom: CodeAstRetrievalAtom): CodeAstFacetModel[];
  buildSymbolFacets(atom: CodeAstRetrievalAtom): CodeAstFacetModel[];
}
