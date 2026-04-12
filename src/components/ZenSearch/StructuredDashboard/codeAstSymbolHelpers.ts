import type {
  CodeAstAnalysisResponse,
  CodeAstRetrievalAtom as ApiCodeAstRetrievalAtom,
} from "../../../api";
import {
  buildCodeAstRetrievalAtom,
  resolveDisplayRetrievalAtom,
  toDisplayRetrievalAtom,
} from "./codeAstRetrievalHelpers";
import { normalizeKind, normalizeText } from "./codeAstProjectionShared";
import type { CodeAstSymbolGroup, CodeAstSymbolModel } from "./codeAstAnatomy";

function countReferences(analysis: CodeAstAnalysisResponse, nodeId: string): number {
  return analysis.edges.filter((edge) => edge.sourceId === nodeId || edge.targetId === nodeId)
    .length;
}

function deriveFallbackSymbolLabel(atom: ApiCodeAstRetrievalAtom): string {
  const displayLabel = normalizeText(atom.displayLabel);
  if (displayLabel?.includes("·")) {
    return displayLabel.split("·").at(-1)?.trim() ?? displayLabel;
  }

  return displayLabel ?? normalizeText(atom.ownerId)?.split(":").at(-1) ?? atom.semanticType;
}

export function buildSymbols(
  analysis: CodeAstAnalysisResponse,
  selectedPath: string,
  focusNodeId: string | null,
  retrievalAtomLookup: Map<string, ApiCodeAstRetrievalAtom>,
): CodeAstSymbolModel[] {
  const nodeById = new Map(analysis.nodes.map((node) => [node.id, node]));
  const backendSymbolAtoms = (analysis.retrievalAtoms ?? [])
    .filter((atom) => atom.surface === "symbol")
    .toSorted((left, right) => {
      const leftLine = left.lineStart ?? Number.MAX_SAFE_INTEGER;
      const rightLine = right.lineStart ?? Number.MAX_SAFE_INTEGER;
      if (leftLine !== rightLine) {
        return leftLine - rightLine;
      }
      return left.chunkId.localeCompare(right.chunkId);
    });

  if (backendSymbolAtoms.length > 0) {
    return backendSymbolAtoms
      .map((atom, index) => {
        const node = nodeById.get(atom.ownerId);
        const path = normalizeText(node?.path) ?? selectedPath;
        const line = node?.line ?? node?.lineStart ?? atom.lineStart;
        const label = node?.label ?? deriveFallbackSymbolLabel(atom);
        const kind = normalizeKind(node?.kind ?? atom.semanticType) || "other";
        const nodeId = node?.id ?? atom.ownerId;

        return {
          id: nodeId,
          label,
          kind,
          path,
          line,
          references: node ? countReferences(analysis, node.id) : 0,
          query: label,
          atom,
          facets: [],
        };
      })
      .toSorted((left, right) => {
        if (left.line != null && right.line != null && left.line !== right.line) {
          return left.line - right.line;
        }
        if (left.references !== right.references) {
          return right.references - left.references;
        }
        return left.label.localeCompare(right.label);
      })
      .slice(0, 10)
      .map((symbol, index) => ({
        ...symbol,
        atom: toDisplayRetrievalAtom(symbol.atom, index + 5),
      }));
  }

  const connectedNodeIds = new Set<string>(
    focusNodeId
      ? analysis.edges.flatMap((edge) => {
          if (edge.sourceId === focusNodeId) {
            return [edge.sourceId, edge.targetId];
          }
          if (edge.targetId === focusNodeId) {
            return [edge.sourceId, edge.targetId];
          }
          return [];
        })
      : [],
  );

  return analysis.nodes
    .filter((node) => {
      const nodePath = normalizeText(node.path);
      const selected = normalizeText(selectedPath);
      const sameFile =
        !nodePath ||
        nodePath === selected ||
        nodePath.endsWith(`/${selectedPath}`) ||
        selected?.endsWith(`/${nodePath}`) === true;
      return (
        sameFile ||
        connectedNodeIds.has(node.id) ||
        normalizeKind(node.kind) === "externalsymbol" ||
        node.id === focusNodeId
      );
    })
    .map((node) => ({
      id: node.id,
      label: node.label,
      kind: normalizeKind(node.kind) || "other",
      path: normalizeText(node.path) ?? selectedPath,
      line: node.line,
      references: countReferences(analysis, node.id),
      query: node.label,
    }))
    .toSorted((left, right) => {
      if (left.line != null && right.line != null && left.line !== right.line) {
        return left.line - right.line;
      }
      if (left.references !== right.references) {
        return right.references - left.references;
      }
      return left.label.localeCompare(right.label);
    })
    .slice(0, 10)
    .map((symbol, index) => {
      const atom = resolveDisplayRetrievalAtom(
        retrievalAtomLookup,
        symbol.id,
        "symbol",
        index + 5,
        () =>
          buildCodeAstRetrievalAtom(
            symbol.path,
            "symbol",
            symbol.kind,
            `${symbol.label}-l${symbol.line ?? 0}`,
            index + 5,
            `${symbol.label}|${symbol.kind}|${symbol.path}|${symbol.line ?? ""}|refs:${symbol.references}`,
          ),
      );
      return {
        id: symbol.id,
        label: symbol.label,
        kind: symbol.kind,
        path: symbol.path,
        line: symbol.line,
        references: symbol.references,
        query: symbol.query,
        atom,
        facets: [],
      };
    });
}

export function buildSymbolGroups(symbols: CodeAstSymbolModel[]): CodeAstSymbolGroup[] {
  const localSymbols = symbols.filter((symbol) => symbol.kind !== "externalsymbol");
  const externalSymbols = symbols.filter((symbol) => symbol.kind === "externalsymbol");
  const pivotAnchors = [...symbols]
    .toSorted((left, right) => {
      if (left.references !== right.references) {
        return right.references - left.references;
      }
      if (left.line != null && right.line != null && left.line !== right.line) {
        return left.line - right.line;
      }
      return left.label.localeCompare(right.label);
    })
    .slice(0, 4);

  return [
    {
      id: "local",
      title: "Local Symbols",
      empty: "No local symbols.",
      symbols: localSymbols,
    },
    {
      id: "external",
      title: "External Symbols",
      empty: "No external symbols.",
      symbols: externalSymbols,
    },
    {
      id: "anchors",
      title: "Pivot Anchors",
      empty: "No pivot anchors.",
      symbols: pivotAnchors,
    },
  ];
}
