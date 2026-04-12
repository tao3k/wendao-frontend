import { isCodeSearchResult } from "../../SearchBar/searchResultNormalization";
import type { SearchResult } from "../../SearchBar/types";
import type { ZenSearchPreviewState } from "../useZenSearchPreview";
import {
  deriveLanguageStructuredProjection,
  resolveStructuredProjectionLanguage,
} from "./language";
import type {
  StructuredChip,
  StructuredEntityModel,
  StructuredFragment,
  StructuredNeighbor,
} from "./structuredIntelligenceTypes";

export type {
  StructuredChip,
  StructuredEntityModel,
  StructuredFragment,
  StructuredNeighbor,
} from "./structuredIntelligenceTypes";

function normalizeText(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildPathTrail(path: string | null | undefined): StructuredChip[] {
  const normalizedPath = normalizeText(path);
  if (!normalizedPath) {
    return [];
  }

  const segments = normalizedPath.split("/").filter((segment) => segment.trim().length > 0);
  const trail: StructuredChip[] = [];

  segments.forEach((segment, index) => {
    trail.push({
      label: segment,
      value: segments.slice(0, index + 1).join("/"),
      query: segments.slice(0, index + 1).join("/"),
    });
  });

  return trail;
}

function truncateText(value: string, maxLength = 220): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function extractHeadings(content: string | null): StructuredChip[] {
  if (!content) {
    return [];
  }

  return content
    .split(/\r?\n/)
    .map((line) => line.match(/^#{1,6}\s+(.+?)\s*$/)?.[1]?.trim())
    .filter((heading): heading is string => Boolean(heading))
    .slice(0, 8)
    .map((heading) => ({
      label: heading,
      value: heading,
      query: heading,
    }));
}

function extractCodeFences(content: string | null): StructuredFragment[] {
  if (!content) {
    return [];
  }

  const fragments: StructuredFragment[] = [];
  const fenceRegex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(content)) !== null && fragments.length < 3) {
    const language = normalizeText(match[1]) ?? "code";
    const body = normalizeText(match[2]) ?? "";
    fragments.push({
      kind: "code",
      label: `code · ${language}`,
      value: truncateText(body, 180),
      query: language,
      language,
    });
  }

  return fragments;
}

function extractMathFragments(content: string | null): StructuredFragment[] {
  if (!content) {
    return [];
  }

  const fragments: StructuredFragment[] = [];
  const blockRegex = /\$\$([\s\S]*?)\$\$|\\\[((?:[\s\S]*?))\\\]/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null && fragments.length < 2) {
    const body = normalizeText(match[1] ?? match[2]) ?? "";
    if (!body) {
      continue;
    }

    fragments.push({
      kind: "math",
      label: "math",
      value: truncateText(body, 180),
      query: "math",
    });
  }

  return fragments;
}

function buildSaliencyExcerpt(result: SearchResult, content: string | null): string | null {
  const bestSection = normalizeText(result.bestSection);
  const matchReason = normalizeText(result.matchReason);

  if (bestSection && content) {
    const index = content.toLowerCase().indexOf(bestSection.toLowerCase());
    if (index >= 0) {
      const start = Math.max(0, index - 80);
      const end = Math.min(content.length, index + bestSection.length + 120);
      const excerpt = content.slice(start, end).replace(/\s+/g, " ").trim();
      if (excerpt.length > 0) {
        return truncateText(excerpt, 220);
      }
    }
  }

  if (bestSection) {
    return bestSection;
  }

  if (matchReason) {
    return matchReason;
  }

  if (!content) {
    return null;
  }

  const normalized = content.replace(/\s+/g, " ").trim();
  return truncateText(normalized, 220);
}

function resolveCodeEntityPivotQuery(result: SearchResult): string | undefined {
  return (
    normalizeText(result.bestSection) ??
    normalizeText(result.title) ??
    normalizeText(result.stem) ??
    normalizeText(result.navigationTarget?.path ?? result.path) ??
    undefined
  );
}

function buildMetadata(result: SearchResult): StructuredChip[] {
  const metadata: StructuredChip[] = [];
  const codeEntityPivotQuery = isCodeSearchResult(result)
    ? resolveCodeEntityPivotQuery(result)
    : undefined;
  const append = (label: string, value: string | undefined | null, query?: string) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      return;
    }
    metadata.push({ label, value: normalized, query });
  };

  append("score", result.score != null ? `${Math.round(result.score * 100)}%` : null);
  append(
    "audit",
    result.auditStatus ?? undefined,
    result.auditStatus ? `audit:${result.auditStatus}` : undefined,
  );
  append(
    "verify",
    result.verification_state ?? undefined,
    result.verification_state ? `verify:${result.verification_state}` : undefined,
  );
  append("kind", result.codeKind ?? result.docType ?? undefined, codeEntityPivotQuery);
  append(
    "language",
    result.codeLanguage ?? undefined,
    result.codeLanguage ? `lang:${result.codeLanguage}` : undefined,
  );
  append(
    "repo",
    result.codeRepo ?? result.projectName ?? undefined,
    result.codeRepo ? `repo:${result.codeRepo}` : undefined,
  );
  append(
    "target",
    result.docTarget ? `${result.docTarget.kind}:${result.docTarget.name}` : undefined,
    result.docTarget?.path ?? result.docTarget?.name,
  );
  append(
    "project",
    result.projectName ?? undefined,
    result.projectName ? `repo:${result.projectName}` : undefined,
  );
  append("root", result.rootLabel ?? undefined, result.rootLabel ? result.rootLabel : undefined);
  append("source", result.searchSource ?? undefined);
  append("section", result.bestSection ?? undefined, result.bestSection ?? undefined);
  append("reason", result.matchReason ?? undefined, result.matchReason ?? undefined);

  const tags = result.tags ?? [];
  if (tags.length > 0) {
    metadata.push({
      label: "tags",
      value: tags.join(", "),
      query: tags[0],
    });
  }

  return metadata;
}

function buildBacklinks(result: SearchResult): StructuredChip[] {
  const items = result.implicitBacklinkItems ?? [];
  if (items.length > 0) {
    return items.slice(0, 8).map((item) => ({
      label: item.title || item.id,
      value: item.path,
      query: item.path,
    }));
  }

  return (result.implicitBacklinks ?? []).slice(0, 8).map((item) => ({
    label: item,
    value: item,
    query: item,
  }));
}

function buildProjectionAnchors(result: SearchResult): StructuredChip[] {
  return (result.projectionPageIds ?? []).slice(0, 8).map((pageId) => ({
    label: pageId.split(":").at(-1) ?? pageId,
    value: pageId,
    query: pageId,
  }));
}

function buildGraphNeighbors(preview: ZenSearchPreviewState): {
  incoming: StructuredNeighbor[];
  outgoing: StructuredNeighbor[];
  graphSummary: StructuredEntityModel["graphSummary"];
} {
  const graphNeighbors = preview.graphNeighbors;
  const selected = preview.selectedResult;

  if (!graphNeighbors || !selected || !graphNeighbors.center) {
    return {
      incoming: [],
      outgoing: [],
      graphSummary: null,
    };
  }

  const centerPath =
    normalizeText(graphNeighbors.center.path) ?? normalizeText(selected.path) ?? "";
  const centerId = graphNeighbors.center.id;
  const nodeById = new Map(graphNeighbors.nodes.map((node) => [node.id, node]));

  const incoming = graphNeighbors.links
    .filter((link) => link.target === centerId)
    .slice(0, 8)
    .map((link) => {
      const node = nodeById.get(link.source);
      return {
        id: link.source,
        label: node?.label ?? link.source,
        path: node?.path ?? link.source,
        direction: "incoming" as const,
        query: node?.path ?? link.source,
      };
    });

  const outgoing = graphNeighbors.links
    .filter((link) => link.source === centerId)
    .slice(0, 8)
    .map((link) => {
      const node = nodeById.get(link.target);
      return {
        id: link.target,
        label: node?.label ?? link.target,
        path: node?.path ?? link.target,
        direction: "outgoing" as const,
        query: node?.path ?? link.target,
      };
    });

  return {
    incoming,
    outgoing,
    graphSummary: {
      centerLabel: graphNeighbors.center.label,
      centerPath,
      totalNodes: graphNeighbors.totalNodes,
      totalLinks: graphNeighbors.totalLinks,
    },
  };
}

export function deriveStructuredEntity(preview: ZenSearchPreviewState): StructuredEntityModel {
  const selected = preview.selectedResult;

  if (!selected) {
    return {
      pathTrail: [],
      metadata: [],
      outline: [],
      fragments: [],
      incoming: [],
      outgoing: [],
      backlinks: [],
      projections: [],
      saliencyExcerpt: null,
      graphSummary: null,
    };
  }

  const content = preview.content;
  const isCodeResult = isCodeSearchResult(selected);
  const codeProjection = isCodeResult
    ? deriveLanguageStructuredProjection({
        analysis: preview.codeAstAnalysis,
        content,
        language: resolveStructuredProjectionLanguage(
          selected.codeLanguage ?? preview.codeAstAnalysis?.language ?? null,
          preview.contentPath ?? selected.navigationTarget?.path ?? selected.path,
        ),
        path: preview.contentPath ?? selected.navigationTarget?.path ?? selected.path,
      })
    : null;
  const headings = isCodeResult ? (codeProjection?.outline ?? []) : extractHeadings(content);
  const codeFragments = isCodeResult
    ? (codeProjection?.fragments ?? [])
    : extractCodeFences(content);
  const mathFragments = isCodeResult ? [] : extractMathFragments(content);
  const saliencyExcerpt = isCodeResult
    ? (codeProjection?.saliencyExcerpt ?? null)
    : buildSaliencyExcerpt(selected, content);
  const metadata = buildMetadata(selected);
  const backlinks = buildBacklinks(selected);
  const projections = buildProjectionAnchors(selected);
  const { incoming, outgoing, graphSummary } = buildGraphNeighbors(preview);

  return {
    pathTrail: buildPathTrail(
      preview.contentPath ?? selected.navigationTarget?.path ?? selected.path,
    ),
    metadata,
    outline: headings,
    fragments: [
      ...codeFragments,
      ...mathFragments,
      ...(codeFragments.length === 0 && saliencyExcerpt
        ? [
            {
              kind: "excerpt" as const,
              label: selected.bestSection ?? "excerpt",
              value: saliencyExcerpt,
              query: selected.bestSection ?? selected.matchReason ?? selected.path,
            },
          ]
        : []),
    ],
    incoming,
    outgoing,
    backlinks,
    projections,
    saliencyExcerpt,
    graphSummary,
  };
}
