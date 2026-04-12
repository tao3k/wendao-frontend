import type { CodeAstAnalysisResponse } from "../../../api";
import type { SearchResult } from "../../SearchBar/types";
import {
  buildBackendAtomLookup,
  buildCodeAstRetrievalAtom,
  type CodeAstRetrievalAtom,
  resolveDisplayRetrievalAtom,
} from "./codeAstRetrievalHelpers";
import { buildCodeBlocks, type CodeAstBlockKind } from "./codeAstBlockHelpers";
import {
  normalizeKind,
  normalizeText,
  pickPrimaryNode,
  splitContentLines,
} from "./codeAstProjectionShared";
import { buildSignatureParts, buildSignatureSnippet } from "./codeAstSignatureHelpers";
import { buildSymbolGroups, buildSymbols } from "./codeAstSymbolHelpers";
import type { StructuredNeighbor } from "./structuredIntelligence";
import type { CodeAstFacetModel } from "./language/anatomy/types";
import {
  buildCodeAstBlockFacets,
  buildCodeAstDeclarationFacets,
  buildCodeAstSymbolFacets,
  resolveCodeAstAnatomyLanguage,
} from "./language/anatomy";

export interface CodeAstTopologyModel {
  incoming: StructuredNeighbor[];
  outgoing: StructuredNeighbor[];
  graphSummary: {
    centerLabel: string;
    centerPath: string;
    totalNodes: number;
    totalLinks: number;
  } | null;
}

export interface CodeAstDeclarationModel {
  id: string;
  label: string;
  kind: string;
  path: string;
  line?: number;
  signature: string;
  query: string;
  atom: CodeAstRetrievalAtom;
  facets: CodeAstFacetModel[];
}

export interface CodeAstSignaturePart {
  id: string;
  label: string;
  value: string;
  query: string;
}

export interface CodeAstBlockModel {
  id: string;
  kind: CodeAstBlockKind;
  title: string;
  lineRange: string;
  excerpt: string;
  anchors: string[];
  query?: string;
  atom: CodeAstRetrievalAtom;
  facets: CodeAstFacetModel[];
}

export interface CodeAstSymbolModel {
  id: string;
  label: string;
  kind: string;
  path: string;
  line?: number;
  references: number;
  query: string;
  atom: CodeAstRetrievalAtom;
  facets: CodeAstFacetModel[];
}

export interface CodeAstSymbolGroup {
  id: string;
  title: string;
  empty: string;
  symbols: CodeAstSymbolModel[];
}

export interface CodeAstAnatomyModel {
  topology: CodeAstTopologyModel;
  declaration: CodeAstDeclarationModel | null;
  signatureParts: CodeAstSignaturePart[];
  blocks: CodeAstBlockModel[];
  symbols: CodeAstSymbolModel[];
  symbolGroups: CodeAstSymbolGroup[];
}
export function deriveCodeAstAnatomy(
  analysis: CodeAstAnalysisResponse,
  content: string | null,
  selectedResult: SearchResult,
): CodeAstAnatomyModel {
  const selectedPath =
    normalizeText(selectedResult.navigationTarget?.path ?? selectedResult.path) ?? analysis.path;
  const language = resolveCodeAstAnatomyLanguage(
    selectedResult.codeLanguage ?? analysis.language ?? null,
    selectedPath,
  );
  const focusNode = pickPrimaryNode(analysis);
  const contentLines = splitContentLines(content);
  const declarationLine = focusNode?.line;
  const retrievalAtomLookup = buildBackendAtomLookup(analysis);
  const declarationAtom = focusNode
    ? resolveDisplayRetrievalAtom(retrievalAtomLookup, focusNode.id, "declaration", 1, () =>
        buildCodeAstRetrievalAtom(
          normalizeText(focusNode.path) ?? selectedPath,
          "declaration",
          normalizeKind(focusNode.kind) || "other",
          `l${focusNode.line ?? 0}`,
          1,
          buildSignatureSnippet(contentLines, declarationLine) || focusNode.label,
        ),
      )
    : null;
  const declaration =
    focusNode && declarationAtom
      ? {
          id: focusNode.id,
          label: focusNode.label,
          kind: normalizeKind(focusNode.kind) || "other",
          path: normalizeText(focusNode.path) ?? selectedPath,
          line: focusNode.line,
          signature:
            normalizeText(declarationAtom.excerpt) ??
            (buildSignatureSnippet(contentLines, declarationLine) || focusNode.label),
          query: focusNode.label,
          atom: declarationAtom,
          facets: buildCodeAstDeclarationFacets(language, selectedPath, declarationAtom),
        }
      : null;
  const signatureParts =
    declaration && declaration.facets.length === 0
      ? buildSignatureParts(declaration.signature)
      : [];
  const centerNodeId = declaration?.id ?? focusNode?.id ?? null;
  const nodeById = new Map(analysis.nodes.map((node) => [node.id, node]));
  const symbols = buildSymbols(analysis, selectedPath, centerNodeId, retrievalAtomLookup).map(
    (symbol) => ({
      ...symbol,
      facets: buildCodeAstSymbolFacets(language, symbol.path, symbol.atom),
    }),
  );

  const incoming = centerNodeId
    ? analysis.edges
        .filter((edge) => edge.targetId === centerNodeId)
        .slice(0, 8)
        .map((edge) => {
          const node = nodeById.get(edge.sourceId);
          return {
            id: edge.sourceId,
            label: node?.label ?? edge.sourceId,
            path: normalizeText(node?.path) ?? selectedPath,
            direction: "incoming" as const,
            query: node?.label ?? edge.sourceId,
          };
        })
    : [];

  const outgoing = centerNodeId
    ? analysis.edges
        .filter((edge) => edge.sourceId === centerNodeId)
        .slice(0, 8)
        .map((edge) => {
          const node = nodeById.get(edge.targetId);
          return {
            id: edge.targetId,
            label: node?.label ?? edge.targetId,
            path: normalizeText(node?.path) ?? selectedPath,
            direction: "outgoing" as const,
            query: node?.label ?? edge.targetId,
          };
        })
    : [];

  return {
    topology: {
      incoming,
      outgoing,
      graphSummary: declaration
        ? {
            centerLabel: declaration.label,
            centerPath:
              declaration.line != null
                ? `${declaration.path}:${declaration.line}`
                : declaration.path,
            totalNodes: analysis.nodes.length,
            totalLinks: analysis.edges.length,
          }
        : null,
    },
    declaration,
    signatureParts,
    blocks: buildCodeBlocks(
      contentLines,
      declarationLine,
      analysis,
      selectedPath,
      retrievalAtomLookup,
    ).map((block) => ({
      ...block,
      facets: buildCodeAstBlockFacets(language, selectedPath, block.atom),
    })),
    symbols,
    symbolGroups: buildSymbolGroups(symbols),
  };
}
