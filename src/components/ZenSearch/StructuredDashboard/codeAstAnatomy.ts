import type { CodeAstAnalysisResponse, CodeAstNode } from '../../../api';
import type { SearchResult } from '../../SearchBar/types';
import type { StructuredNeighbor } from './structuredIntelligence';

type CodeAstBlockKind = 'validation' | 'execution' | 'return';

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
}

export interface CodeAstSymbolModel {
  id: string;
  label: string;
  kind: string;
  path: string;
  line?: number;
  references: number;
  query: string;
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

export interface CodeAstRetrievalAtom {
  id: string;
  displayId: string;
  semanticType: string;
  fingerprint: string;
  tokenEstimate: number;
}

function normalizeText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeKind(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function buildStableFingerprint(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return `fp:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function estimateTokenCount(value: string): number {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}

function buildCodeAstRetrievalAtom(
  path: string,
  scope: 'declaration' | 'block',
  semanticType: string,
  locator: string,
  ordinal: number,
  content: string
): CodeAstRetrievalAtom {
  const pathSlug = slugifySegment(path);
  const semanticSlug = slugifySegment(semanticType);
  const locatorSlug = slugifySegment(locator);

  return {
    id: `ast:${pathSlug}:${scope}:${semanticSlug}:${locatorSlug}`,
    displayId: `ast:${String(ordinal).padStart(2, '0')}`,
    semanticType,
    fingerprint: buildStableFingerprint([path, scope, semanticType, locator, content.slice(0, 240)].join('|')),
    tokenEstimate: estimateTokenCount(content),
  };
}

function splitContentLines(content: string | null): string[] {
  if (!content) {
    return [];
  }

  return content.split(/\r?\n/);
}

function pickPrimaryNode(analysis: CodeAstAnalysisResponse): CodeAstNode | null {
  const focusNode = analysis.nodes.find((node) => node.id === analysis.focusNodeId);
  if (focusNode) {
    return focusNode;
  }

  const prioritizedKinds = ['function', 'type', 'module', 'constant', 'externalsymbol'];
  for (const kind of prioritizedKinds) {
    const node = analysis.nodes.find((candidate) => normalizeKind(candidate.kind) === kind);
    if (node) {
      return node;
    }
  }

  return analysis.nodes[0] ?? null;
}

function buildSignatureSnippet(contentLines: string[], line: number | undefined): string {
  if (!line || line <= 0 || contentLines.length === 0) {
    return '';
  }

  const startIndex = Math.max(0, Math.min(contentLines.length - 1, line - 1));
  const collected: string[] = [];

  for (let index = startIndex; index < contentLines.length && collected.length < 5; index += 1) {
    const current = contentLines[index].trimEnd();
    if (collected.length === 0 && current.trim().length === 0) {
      continue;
    }

    collected.push(current);

    const joined = collected.join('\n');
    if (collected.length >= 2 && (/[{;]\s*$/.test(current) || joined.includes('=>'))) {
      break;
    }
  }

  return collected.join('\n').trim();
}

function findTopLevelIndex(source: string, target: string): number {
  let parenDepth = 0;
  let angleDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;
  let singleQuote = false;
  let doubleQuote = false;
  let templateQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1] ?? '';
    const previous = source[index - 1] ?? '';

    if (!doubleQuote && !templateQuote && current === '\'' && previous !== '\\') {
      singleQuote = !singleQuote;
    } else if (!singleQuote && !templateQuote && current === '"' && previous !== '\\') {
      doubleQuote = !doubleQuote;
    } else if (!singleQuote && !doubleQuote && current === '`' && previous !== '\\') {
      templateQuote = !templateQuote;
    }

    if (singleQuote || doubleQuote || templateQuote) {
      continue;
    }

    if (target === '=>' && current === '=' && next === '>') {
      if (parenDepth === 0 && angleDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
        return index;
      }
      continue;
    }

    if (current === target) {
      if (parenDepth === 0 && angleDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
        return index;
      }
    }

    switch (current) {
      case '(':
        parenDepth += 1;
        break;
      case ')':
        parenDepth = Math.max(0, parenDepth - 1);
        break;
      case '<':
        angleDepth += 1;
        break;
      case '>':
        angleDepth = Math.max(0, angleDepth - 1);
        break;
      case '[':
        squareDepth += 1;
        break;
      case ']':
        squareDepth = Math.max(0, squareDepth - 1);
        break;
      case '{':
        curlyDepth += 1;
        break;
      case '}':
        curlyDepth = Math.max(0, curlyDepth - 1);
        break;
      default:
        break;
    }
  }

  return -1;
}

function splitTopLevel(source: string, delimiter: string): string[] {
  const items: string[] = [];
  let start = 0;
  let parenDepth = 0;
  let angleDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;
  let singleQuote = false;
  let doubleQuote = false;
  let templateQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1] ?? '';
    const previous = source[index - 1] ?? '';

    if (!doubleQuote && !templateQuote && current === '\'' && previous !== '\\') {
      singleQuote = !singleQuote;
    } else if (!singleQuote && !templateQuote && current === '"' && previous !== '\\') {
      doubleQuote = !doubleQuote;
    } else if (!singleQuote && !doubleQuote && current === '`' && previous !== '\\') {
      templateQuote = !templateQuote;
    }

    if (!singleQuote && !doubleQuote && !templateQuote) {
      switch (current) {
        case '(':
          parenDepth += 1;
          break;
        case ')':
          parenDepth = Math.max(0, parenDepth - 1);
          break;
        case '<':
          angleDepth += 1;
          break;
        case '>':
          angleDepth = Math.max(0, angleDepth - 1);
          break;
        case '[':
          squareDepth += 1;
          break;
        case ']':
          squareDepth = Math.max(0, squareDepth - 1);
          break;
        case '{':
          curlyDepth += 1;
          break;
        case '}':
          curlyDepth = Math.max(0, curlyDepth - 1);
          break;
        default:
          break;
      }
    }

    if (
      !singleQuote
      && !doubleQuote
      && !templateQuote
      && parenDepth === 0
      && angleDepth === 0
      && squareDepth === 0
      && curlyDepth === 0
      && source.startsWith(delimiter, index)
    ) {
      items.push(source.slice(start, index).trim());
      start = index + delimiter.length;
      index = start - 1;
    }
  }

  const last = source.slice(start).trim();
  if (last) {
    items.push(last);
  }

  return items.filter((item) => item.length > 0);
}

function extractBalancedSegment(source: string, openIndex: number, openChar: string, closeChar: string): { segment: string; closeIndex: number } | null {
  let depth = 0;
  let singleQuote = false;
  let doubleQuote = false;
  let templateQuote = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const current = source[index];
    const previous = source[index - 1] ?? '';

    if (!doubleQuote && !templateQuote && current === '\'' && previous !== '\\') {
      singleQuote = !singleQuote;
    } else if (!singleQuote && !templateQuote && current === '"' && previous !== '\\') {
      doubleQuote = !doubleQuote;
    } else if (!singleQuote && !doubleQuote && current === '`' && previous !== '\\') {
      templateQuote = !templateQuote;
    }

    if (singleQuote || doubleQuote || templateQuote) {
      continue;
    }

    if (current === openChar) {
      depth += 1;
    } else if (current === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return {
          segment: source.slice(openIndex + 1, index),
          closeIndex: index,
        };
      }
    }
  }

  return null;
}

function extractSignatureReturnType(signature: string, closeParenIndex: number): string | null {
  const tail = signature.slice(closeParenIndex + 1).trim();
  if (!tail) {
    return null;
  }

  const arrowIndex = findTopLevelIndex(tail, '=>');
  const braceIndex = findTopLevelIndex(tail, '{');
  const semicolonIndex = findTopLevelIndex(tail, ';');
  const endCandidates = [arrowIndex, braceIndex, semicolonIndex].filter((value) => value >= 0);
  const endIndex = endCandidates.length > 0 ? Math.min(...endCandidates) : tail.length;

  const candidate = tail.slice(0, endIndex).trim().replace(/^(?:->|:)\s*/, '').trim();
  return candidate.length > 0 ? candidate : null;
}

function buildSignatureParts(signature: string): CodeAstSignaturePart[] {
  const normalized = signature.trim();
  if (!normalized) {
    return [];
  }

  const openIndex = normalized.indexOf('(');
  if (openIndex < 0) {
    return [];
  }

  const balanced = extractBalancedSegment(normalized, openIndex, '(', ')');
  if (!balanced) {
    return [];
  }

  const parts: CodeAstSignaturePart[] = [];
  const parameters = splitTopLevel(balanced.segment, ',');

  parameters.forEach((parameter, index) => {
    const trimmed = parameter.trim();
    if (!trimmed) {
      return;
    }

    const raw = trimmed.replace(/\s*=\s*.+$/, '').trim();
    const colonIndex = findTopLevelIndex(raw, ':');
    const hasTypedParameter = colonIndex >= 0;
    const name = hasTypedParameter ? raw.slice(0, colonIndex).trim() : raw;
    const type = hasTypedParameter ? raw.slice(colonIndex + 1).trim() : '';

    if (name) {
      parts.push({
        id: `param-name-${index}-${name}`,
        label: 'param',
        value: name,
        query: name,
      });
    }

    if (type) {
      parts.push({
        id: `param-type-${index}-${type}`,
        label: 'type',
        value: type,
        query: type,
      });
    } else if (!hasTypedParameter) {
      parts.push({
        id: `param-raw-${index}-${raw}`,
        label: 'param',
        value: raw,
        query: raw,
      });
    }
  });

  const returnType = extractSignatureReturnType(normalized, balanced.closeIndex);
  if (returnType) {
    parts.push({
      id: `return-${returnType}`,
      label: 'return',
      value: returnType,
      query: returnType,
    });
  }

  return parts;
}

function classifyBlockKind(lines: string[]): CodeAstBlockKind {
  const text = lines.join('\n');
  const lower = text.toLowerCase();

  if (
    /^\s*(if|guard|assert|ensure|require|check)\b/m.test(text)
    || /return\s+err\b/.test(lower)
    || /\b(?:panic!|throw|raise)\b/.test(lower)
  ) {
    return 'validation';
  }

  if (/^\s*return\b/m.test(text) || /\b(?:ok|err|some|none)\s*\(/.test(lower)) {
    return 'return';
  }

  return 'execution';
}

function buildBlockTitle(kind: CodeAstBlockKind, lines: string[]): string {
  const head = lines.find((line) => line.trim().length > 0)?.trim() ?? '';

  switch (kind) {
    case 'validation':
      return head ? `Validation Block · ${head}` : 'Validation Block';
    case 'return':
      return head ? `Return Path · ${head}` : 'Return Path';
    default:
      return head ? `Execution Block · ${head}` : 'Execution Block';
  }
}

function buildBlockQuery(kind: CodeAstBlockKind, anchors: string[]): string {
  if (anchors.length > 0) {
    return anchors[0];
  }

  switch (kind) {
    case 'validation':
      return 'validation';
    case 'return':
      return 'return';
    default:
      return 'execution';
  }
}

interface RawBlockSegment {
  start: number;
  end: number;
  lines: string[];
}

function resolveBodyStartIndex(contentLines: string[], declarationLine: number | undefined): number {
  if (!declarationLine || declarationLine <= 0) {
    return 0;
  }

  const declarationIndex = declarationLine - 1;

  for (let index = declarationIndex; index < contentLines.length; index += 1) {
    const current = contentLines[index].trim();
    if (current.length === 0) {
      continue;
    }

    const hasBodyDelimiter =
      current.includes('{')
      || current.includes('=>')
      || /^\s*(begin|algorithm|equation)\b/.test(current);

    if (index === declarationIndex) {
      if (hasBodyDelimiter) {
        return index + 1;
      }
      continue;
    }

    if (hasBodyDelimiter) {
      return index + 1;
    }
  }

  return declarationLine;
}

function collectSegments(contentLines: string[], declarationLine: number | undefined): RawBlockSegment[] {
  const bodyStartIndex = resolveBodyStartIndex(contentLines, declarationLine);
  const bodyLines = contentLines.slice(bodyStartIndex);
  const segments: RawBlockSegment[] = [];
  let current: RawBlockSegment | null = null;

  bodyLines.forEach((line, offset) => {
    const absoluteLine = bodyStartIndex + offset + 1;

    if (line.trim().length === 0) {
      if (current && current.lines.length > 0) {
        segments.push(current);
        current = null;
      }
      return;
    }

    if (!current) {
      current = {
        start: absoluteLine,
        end: absoluteLine,
        lines: [],
      };
    }

    current.lines.push(line);
    current.end = absoluteLine;
  });

  if (current && current.lines.length > 0) {
    segments.push(current);
  }

  return segments;
}

function buildCodeBlocks(
  contentLines: string[],
  declarationLine: number | undefined,
  analysis: CodeAstAnalysisResponse,
  selectedPath: string
): CodeAstBlockModel[] {
  if (contentLines.length === 0) {
    return [];
  }

  const segments = collectSegments(contentLines, declarationLine);
  if (segments.length === 0) {
    return [];
  }

  const grouped = new Map<CodeAstBlockKind, Array<RawBlockSegment & { anchors: string[] }>>();

  segments.forEach((segment) => {
    const kind = classifyBlockKind(segment.lines);
    const anchors = analysis.nodes
      .filter((node) => {
        if (!node.line) {
          return false;
        }

        const nodePath = normalizeText(node.path);
        const selected = normalizeText(selectedPath);
        const sameFile =
          nodePath === selected
          || nodePath?.endsWith(`/${selectedPath}`) === true
          || selected?.endsWith(`/${nodePath}`) === true;
        return sameFile && node.line >= segment.start && node.line <= segment.end;
      })
      .map((node) => node.label)
      .filter((label) => label.trim().length > 0);

    const current = grouped.get(kind) ?? [];
    current.push({ ...segment, anchors });
    grouped.set(kind, current);
  });

  const orderedKinds: CodeAstBlockKind[] = ['validation', 'execution', 'return'];
  const blocks: CodeAstBlockModel[] = [];

  orderedKinds.forEach((kind) => {
    const groupedSegments = grouped.get(kind) ?? [];
    if (groupedSegments.length === 0) {
      return;
    }

    const start = Math.min(...groupedSegments.map((segment) => segment.start));
    const end = Math.max(...groupedSegments.map((segment) => segment.end));
    const anchors = Array.from(new Set(groupedSegments.flatMap((segment) => segment.anchors)));
    const excerpt = groupedSegments
      .flatMap((segment) => [
        ...segment.lines.slice(0, 6),
        segment.lines.length > 6 ? '…' : '',
      ])
      .filter((line) => line.length > 0)
      .join('\n')
      .trim();

    blocks.push({
      id: `${kind}-${start}-${end}`,
      kind,
      title: buildBlockTitle(kind, groupedSegments[0]?.lines ?? []),
      lineRange: `L${start}-L${end}`,
      excerpt: excerpt.length > 0 ? excerpt : '(empty block)',
      anchors,
      query: buildBlockQuery(kind, anchors),
      atom: buildCodeAstRetrievalAtom(
        selectedPath,
        'block',
        kind,
        `l${start}-l${end}`,
        blocks.length + 2,
        excerpt.length > 0 ? excerpt : groupedSegments[0]?.lines.join('\n') ?? kind
      ),
    });
  });

  if (blocks.length > 0) {
    return blocks;
  }

  const fallback = segments[0];
  return [
    {
      id: `execution-${fallback.start}-${fallback.end}`,
      kind: 'execution',
      title: buildBlockTitle('execution', fallback.lines),
      lineRange: `L${fallback.start}-L${fallback.end}`,
      excerpt: fallback.lines.slice(0, 8).join('\n').trim(),
      anchors: [],
      query: 'execution',
      atom: buildCodeAstRetrievalAtom(
        selectedPath,
        'block',
        'execution',
        `l${fallback.start}-l${fallback.end}`,
        2,
        fallback.lines.join('\n')
      ),
    },
  ];
}

function countReferences(analysis: CodeAstAnalysisResponse, nodeId: string): number {
  return analysis.edges.filter((edge) => edge.sourceId === nodeId || edge.targetId === nodeId).length;
}

function buildSymbols(
  analysis: CodeAstAnalysisResponse,
  selectedPath: string,
  focusNodeId: string | null
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
        !nodePath
        || nodePath === selected
        || nodePath.endsWith(`/${selectedPath}`)
        || selected?.endsWith(`/${nodePath}`) === true;
      return sameFile || connectedNodeIds.has(node.id) || normalizeKind(node.kind) === 'externalsymbol' || node.id === focusNodeId;
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
    .slice(0, 10);
}

function buildSymbolGroups(symbols: CodeAstSymbolModel[]): CodeAstSymbolGroup[] {
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

export function deriveCodeAstAnatomy(
  analysis: CodeAstAnalysisResponse,
  content: string | null,
  selectedResult: SearchResult
): CodeAstAnatomyModel {
  const selectedPath = normalizeText(selectedResult.navigationTarget?.path ?? selectedResult.path) ?? analysis.path;
  const focusNode = pickPrimaryNode(analysis);
  const contentLines = splitContentLines(content);
  const declarationLine = focusNode?.line;
  const declaration =
    focusNode
      ? {
          id: focusNode.id,
          label: focusNode.label,
          kind: normalizeKind(focusNode.kind) || 'other',
          path: normalizeText(focusNode.path) ?? selectedPath,
          line: focusNode.line,
          signature: buildSignatureSnippet(contentLines, declarationLine) || focusNode.label,
          query: focusNode.label,
          atom: buildCodeAstRetrievalAtom(
            normalizeText(focusNode.path) ?? selectedPath,
            'declaration',
            normalizeKind(focusNode.kind) || 'other',
            `l${focusNode.line ?? 0}`,
            1,
            buildSignatureSnippet(contentLines, declarationLine) || focusNode.label
          ),
        }
      : null;
  const signatureParts = declaration ? buildSignatureParts(declaration.signature) : [];
  const centerNodeId = declaration?.id ?? focusNode?.id ?? null;
  const nodeById = new Map(analysis.nodes.map((node) => [node.id, node]));
  const symbols = buildSymbols(analysis, selectedPath, centerNodeId);

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
            direction: 'incoming' as const,
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
            direction: 'outgoing' as const,
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
            centerPath: declaration.line != null ? `${declaration.path}:${declaration.line}` : declaration.path,
            totalNodes: analysis.nodes.length,
            totalLinks: analysis.edges.length,
          }
        : null,
    },
    declaration,
    signatureParts,
    blocks: buildCodeBlocks(contentLines, declarationLine, analysis, selectedPath),
    symbols,
    symbolGroups: buildSymbolGroups(symbols),
  };
}
