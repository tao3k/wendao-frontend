import type {
  CodeAstAnalysisResponse,
  CodeAstRetrievalAtom as ApiCodeAstRetrievalAtom,
} from '../../../api';
import {
  buildCodeAstRetrievalAtom,
  resolveDisplayRetrievalAtom,
} from './codeAstRetrievalHelpers';
import { normalizeKind, normalizeText } from './codeAstProjectionShared';
import type { CodeAstSymbolGroup, CodeAstSymbolModel } from './codeAstAnatomy';

function countReferences(analysis: CodeAstAnalysisResponse, nodeId: string): number {
  return analysis.edges.filter((edge) => edge.sourceId === nodeId || edge.targetId === nodeId).length;
}

export function buildSymbols(
  analysis: CodeAstAnalysisResponse,
  selectedPath: string,
  focusNodeId: string | null,
  retrievalAtomLookup: Map<string, ApiCodeAstRetrievalAtom>
): CodeAstSymbolModel[] {
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
      : []
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
        normalizeKind(node.kind) === 'externalsymbol' ||
        node.id === focusNodeId
      );
    })
    .map((node) => ({
      id: node.id,
      label: node.label,
      kind: normalizeKind(node.kind) || 'other',
      path: normalizeText(node.path) ?? selectedPath,
      line: node.line,
      references: countReferences(analysis, node.id),
      query: node.label,
    }))
    .sort((left, right) => {
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
      atom: resolveDisplayRetrievalAtom(
        retrievalAtomLookup,
        symbol.id,
        'symbol',
        index + 5,
        () =>
          buildCodeAstRetrievalAtom(
            symbol.path,
            'symbol',
            symbol.kind,
            `${symbol.label}-l${symbol.line ?? 0}`,
            index + 5,
            `${symbol.label}|${symbol.kind}|${symbol.path}|${symbol.line ?? ''}|refs:${symbol.references}`
          )
      ),
    }));
}

export function buildSymbolGroups(symbols: CodeAstSymbolModel[]): CodeAstSymbolGroup[] {
  const localSymbols = symbols.filter((symbol) => symbol.kind !== 'externalsymbol');
  const externalSymbols = symbols.filter((symbol) => symbol.kind === 'externalsymbol');
  const pivotAnchors = [...symbols]
    .sort((left, right) => {
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
      id: 'local',
      title: 'Local Symbols',
      empty: 'No local symbols.',
      symbols: localSymbols,
    },
    {
      id: 'external',
      title: 'External Symbols',
      empty: 'No external symbols.',
      symbols: externalSymbols,
    },
    {
      id: 'anchors',
      title: 'Pivot Anchors',
      empty: 'No pivot anchors.',
      symbols: pivotAnchors,
    },
  ];
}
