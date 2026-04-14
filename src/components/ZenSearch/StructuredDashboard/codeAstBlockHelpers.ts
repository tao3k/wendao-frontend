import type {
  CodeAstAnalysisResponse,
  CodeAstRetrievalAtom as ApiCodeAstRetrievalAtom,
} from "../../../api";
import type { ArrowRetrievalLookup } from "../../../utils/arrowRetrievalLookup";
import {
  buildCodeAstRetrievalAtom,
  resolveDisplayRetrievalAtom,
  toDisplayRetrievalAtom,
} from "./codeAstRetrievalHelpers";
import { normalizeKind, normalizeText } from "./codeAstProjectionShared";
import type { CodeAstBlockModel } from "./codeAstAnatomy";

export type CodeAstBlockKind = "validation" | "execution" | "return";

interface RawBlockSegment {
  start: number;
  end: number;
  lines: string[];
}

function formatLineRange(start: number | undefined, end: number | undefined): string {
  if (!start || start <= 0) {
    return "L?";
  }

  if (!end || end <= 0) {
    return `L${start}`;
  }

  return `L${start}-L${end}`;
}

function parseOwnerLineRange(ownerId: string): { start: number; end: number } | null {
  const match = /^block:[^:]+:(\d+)-(\d+)$/.exec(ownerId);
  if (!match) {
    return null;
  }

  return {
    start: Number(match[1]),
    end: Number(match[2]),
  };
}

function buildExcerptFromContentLines(
  contentLines: string[],
  lineStart: number | undefined,
  lineEnd: number | undefined,
): string | null {
  if (!lineStart || lineStart <= 0 || contentLines.length === 0) {
    return null;
  }

  const startIndex = Math.max(0, lineStart - 1);
  const endIndex = Math.min(contentLines.length, Math.max(lineStart, lineEnd ?? lineStart));
  const excerpt = contentLines.slice(startIndex, endIndex).join("\n").trim();
  return excerpt.length > 0 ? excerpt : null;
}

function normalizeBlockKind(semanticType: string): CodeAstBlockKind {
  const normalizedSemanticType = normalizeKind(semanticType);
  if (
    normalizedSemanticType === "validation" ||
    normalizedSemanticType === "execution" ||
    normalizedSemanticType === "return"
  ) {
    return normalizedSemanticType;
  }

  return "execution";
}

function blockPriority(kind: CodeAstBlockKind): number {
  switch (kind) {
    case "validation":
      return 0;
    case "execution":
      return 1;
    case "return":
      return 2;
    default:
      return 99;
  }
}

function classifyBlockKind(lines: string[]): CodeAstBlockKind {
  const text = lines.join("\n");
  const lower = text.toLowerCase();

  if (
    /^\s*(if|guard|assert|ensure|require|check)\b/m.test(text) ||
    /return\s+err\b/.test(lower) ||
    /\b(?:panic!|throw|raise)\b/.test(lower)
  ) {
    return "validation";
  }

  if (/^\s*return\b/m.test(text) || /\b(?:ok|err|some|none)\s*\(/.test(lower)) {
    return "return";
  }

  return "execution";
}

function buildBlockTitle(kind: CodeAstBlockKind, lines: string[]): string {
  const head = lines.find((line) => line.trim().length > 0)?.trim() ?? "";

  switch (kind) {
    case "validation":
      return head ? `Validation Block · ${head}` : "Validation Block";
    case "return":
      return head ? `Return Path · ${head}` : "Return Path";
    default:
      return head ? `Execution Block · ${head}` : "Execution Block";
  }
}

function buildBlockQuery(kind: CodeAstBlockKind, anchors: string[]): string {
  if (anchors.length > 0) {
    return anchors[0];
  }

  switch (kind) {
    case "validation":
      return "validation";
    case "return":
      return "return";
    default:
      return "execution";
  }
}

function resolveBodyStartIndex(
  contentLines: string[],
  declarationLine: number | undefined,
): number {
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
      current.includes("{") ||
      current.includes("=>") ||
      /^\s*(begin|algorithm|equation)\b/.test(current);

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

function collectSegments(
  contentLines: string[],
  declarationLine: number | undefined,
): RawBlockSegment[] {
  const bodyStartIndex = resolveBodyStartIndex(contentLines, declarationLine);
  const bodyLines = contentLines.slice(bodyStartIndex);
  const segments: RawBlockSegment[] = [];
  let current: RawBlockSegment | null = null;

  for (const [offset, line] of bodyLines.entries()) {
    const absoluteLine = bodyStartIndex + offset + 1;

    if (line.trim().length === 0) {
      if (current && current.lines.length > 0) {
        segments.push(current);
        current = null;
      }
      continue;
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
  }

  if (current && current.lines.length > 0) {
    segments.push(current);
  }

  return segments;
}

export function buildCodeBlocks(
  contentLines: string[],
  declarationLine: number | undefined,
  analysis: CodeAstAnalysisResponse,
  selectedPath: string,
  retrievalAtomLookup: ArrowRetrievalLookup<ApiCodeAstRetrievalAtom>,
): CodeAstBlockModel[] {
  if (contentLines.length === 0) {
    return (
      analysis.retrievalAtoms
        ?.filter((atom) => atom.surface === "block")
        .slice(0, 6)
        .map((atom, index) => ({
          id: atom.chunkId,
          kind: normalizeBlockKind(atom.semanticType),
          title: atom.displayLabel ?? atom.semanticType,
          lineRange: formatLineRange(atom.lineStart, atom.lineEnd),
          excerpt: atom.excerpt ?? "(empty block)",
          anchors: [],
          query: atom.displayLabel ?? atom.semanticType,
          atom: toDisplayRetrievalAtom(atom, index + 2),
          facets: [],
        })) ?? []
    );
  }

  const backendBlocks = (analysis.retrievalAtoms ?? [])
    .filter((atom) => atom.surface === "block")
    .toSorted((left, right) => {
      const leftKind = normalizeBlockKind(left.semanticType);
      const rightKind = normalizeBlockKind(right.semanticType);
      const priorityDelta = blockPriority(leftKind) - blockPriority(rightKind);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const leftRange = parseOwnerLineRange(left.ownerId);
      const rightRange = parseOwnerLineRange(right.ownerId);
      const leftLine = left.lineStart ?? leftRange?.start ?? Number.MAX_SAFE_INTEGER;
      const rightLine = right.lineStart ?? rightRange?.start ?? Number.MAX_SAFE_INTEGER;
      if (leftLine !== rightLine) {
        return leftLine - rightLine;
      }

      return left.chunkId.localeCompare(right.chunkId);
    })
    .slice(0, 6)
    .map((atom, index) => {
      const ownerRange = parseOwnerLineRange(atom.ownerId);
      const start = atom.lineStart ?? ownerRange?.start;
      const end = atom.lineEnd ?? ownerRange?.end ?? atom.lineStart;
      const anchors =
        typeof start === "number" && typeof end === "number"
          ? analysis.nodes
              .filter((node) => {
                const nodePath = normalizeText(node.path);
                const selected = normalizeText(selectedPath);
                const sameFile =
                  nodePath === selected ||
                  nodePath?.endsWith(`/${selectedPath}`) === true ||
                  selected?.endsWith(`/${nodePath}`) === true;
                const nodeLine = node.lineStart;
                return (
                  sameFile && typeof nodeLine === "number" && nodeLine >= start && nodeLine <= end
                );
              })
              .map((node) => node.label)
              .filter((label) => label.trim().length > 0)
          : [];
      const excerpt =
        atom.excerpt ?? buildExcerptFromContentLines(contentLines, start, end) ?? "(empty block)";

      return {
        id: atom.chunkId,
        kind: normalizeBlockKind(atom.semanticType),
        title:
          atom.displayLabel ?? buildBlockTitle(normalizeBlockKind(atom.semanticType), [excerpt]),
        lineRange: formatLineRange(start, end),
        excerpt,
        anchors,
        query: anchors[0] ?? atom.displayLabel ?? atom.semanticType,
        atom: toDisplayRetrievalAtom(atom, index + 2),
        facets: [],
      };
    });

  if (backendBlocks.length > 0) {
    return backendBlocks;
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
        if (!node.lineStart) {
          return false;
        }

        const nodePath = normalizeText(node.path);
        const selected = normalizeText(selectedPath);
        const sameFile =
          nodePath === selected ||
          nodePath?.endsWith(`/${selectedPath}`) === true ||
          selected?.endsWith(`/${nodePath}`) === true;
        return sameFile && node.lineStart >= segment.start && node.lineStart <= segment.end;
      })
      .map((node) => node.label)
      .filter((label) => label.trim().length > 0);

    const current = grouped.get(kind) ?? [];
    current.push({ ...segment, anchors });
    grouped.set(kind, current);
  });

  const orderedKinds: CodeAstBlockKind[] = ["validation", "execution", "return"];
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
      .flatMap((segment) => [...segment.lines.slice(0, 6), segment.lines.length > 6 ? "…" : ""])
      .filter((line) => line.length > 0)
      .join("\n")
      .trim();
    const ownerId = `block:${kind}:${start}-${end}`;
    const backendAtom = retrievalAtomLookup.findByOwnerSurface(ownerId, "block");
    const resolvedTitle =
      backendAtom?.displayLabel ?? buildBlockTitle(kind, groupedSegments[0]?.lines ?? []);
    const resolvedExcerpt =
      backendAtom?.excerpt ?? (excerpt.length > 0 ? excerpt : "(empty block)");

    blocks.push({
      id: `${kind}-${start}-${end}`,
      kind,
      title: resolvedTitle,
      lineRange: `L${start}-L${end}`,
      excerpt: resolvedExcerpt,
      anchors,
      query: buildBlockQuery(kind, anchors),
      atom: resolveDisplayRetrievalAtom(
        retrievalAtomLookup,
        ownerId,
        "block",
        blocks.length + 2,
        () =>
          buildCodeAstRetrievalAtom(
            selectedPath,
            "block",
            kind,
            `l${start}-l${end}`,
            blocks.length + 2,
            excerpt.length > 0 ? excerpt : (groupedSegments[0]?.lines.join("\n") ?? kind),
          ),
      ),
      facets: [],
    });
  });

  if (blocks.length > 0) {
    return blocks;
  }

  const fallback = segments[0];
  if (!fallback) {
    return [];
  }

  return [
    {
      id: `execution-${fallback.start}-${fallback.end}`,
      kind: "execution",
      title:
        retrievalAtomLookup.findByOwnerSurface(
          `block:execution:${fallback.start}-${fallback.end}`,
          "block",
        )?.displayLabel ?? buildBlockTitle("execution", fallback.lines),
      lineRange: `L${fallback.start}-L${fallback.end}`,
      excerpt:
        retrievalAtomLookup.findByOwnerSurface(
          `block:execution:${fallback.start}-${fallback.end}`,
          "block",
        )?.excerpt ?? fallback.lines.slice(0, 8).join("\n").trim(),
      anchors: [],
      query: "execution",
      atom: resolveDisplayRetrievalAtom(
        retrievalAtomLookup,
        `block:execution:${fallback.start}-${fallback.end}`,
        "block",
        2,
        () =>
          buildCodeAstRetrievalAtom(
            selectedPath,
            "block",
            "execution",
            `l${fallback.start}-l${fallback.end}`,
            2,
            fallback.lines.join("\n"),
          ),
      ),
      facets: [],
    },
  ];
}
