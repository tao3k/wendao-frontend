import type { SearchResult } from "../../SearchBar/types";
import { isCodeSearchResult } from "../../SearchBar/searchResultNormalization";
import type { ZenSearchPreviewState } from "../useZenSearchPreview";

export interface StructuredChip {
  label: string;
  value: string;
  query?: string;
}

export interface StructuredFragment {
  kind: "heading" | "code" | "math" | "excerpt";
  label: string;
  value: string;
  query?: string;
  language?: string;
}

export interface StructuredNeighbor {
  id: string;
  label: string;
  path: string;
  direction: "incoming" | "outgoing";
  query?: string;
}

export interface StructuredEntityModel {
  pathTrail: StructuredChip[];
  metadata: StructuredChip[];
  outline: StructuredChip[];
  fragments: StructuredFragment[];
  incoming: StructuredNeighbor[];
  outgoing: StructuredNeighbor[];
  backlinks: StructuredChip[];
  projections: StructuredChip[];
  saliencyExcerpt: string | null;
  graphSummary: {
    centerLabel: string;
    centerPath: string;
    totalNodes: number;
    totalLinks: number;
  } | null;
}

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

interface OutlinePattern {
  kind: string;
  regex: RegExp;
}

const GENERIC_CODE_OUTLINE_PATTERNS: OutlinePattern[] = [
  { kind: "function", regex: /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/ },
  { kind: "class", regex: /^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)\b/ },
  { kind: "interface", regex: /^(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)\b/ },
  { kind: "type", regex: /^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\b/ },
  { kind: "enum", regex: /^(?:export\s+)?enum\s+([A-Za-z_$][\w$]*)\b/ },
  { kind: "struct", regex: /^(?:pub\s+)?struct\s+([A-Za-z_][\w:]*)\b/ },
  { kind: "trait", regex: /^(?:pub\s+)?trait\s+([A-Za-z_][\w:]*)\b/ },
  { kind: "module", regex: /^(?:pub\s+)?mod\s+([A-Za-z_][\w:]*)\b/ },
  { kind: "def", regex: /^(?:async\s+)?def\s+([A-Za-z_][\w]*)\s*\(/ },
  { kind: "method", regex: /^func\s+(?:\([^)]+\)\s*)?([A-Za-z_][\w]*)\s*\(/ },
  {
    kind: "model",
    regex:
      /^(?:partial\s+)?(?:encapsulated\s+)?(?:model|block|class|function|package|record|connector|operator)\s+([A-Za-z_][\w]*)\b/,
  },
];

const LANGUAGE_CODE_OUTLINE_PATTERNS: Record<string, OutlinePattern[]> = {
  rust: [
    {
      kind: "function",
      regex: /^(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][\w]*)\s*(?:<[^>]*>)?\s*\(/,
    },
    { kind: "struct", regex: /^(?:pub\s+)?struct\s+([A-Za-z_][\w:]*)\b/ },
    { kind: "enum", regex: /^(?:pub\s+)?enum\s+([A-Za-z_][\w:]*)\b/ },
    { kind: "trait", regex: /^(?:pub\s+)?trait\s+([A-Za-z_][\w:]*)\b/ },
    { kind: "impl", regex: /^impl(?:<[^>]+>)?\s+([A-Za-z_][\w:]*)/ },
    { kind: "module", regex: /^(?:pub\s+)?mod\s+([A-Za-z_][\w:]*)\b/ },
  ],
  julia: [
    { kind: "function", regex: /^(?:function\s+)?([A-Za-z_][\w!]*)\s*\(/ },
    { kind: "struct", regex: /^(?:mutable\s+)?struct\s+([A-Za-z_][\w!]*)\b/ },
    { kind: "module", regex: /^module\s+([A-Za-z_][\w!]*)\b/ },
    { kind: "macro", regex: /^macro\s+([A-Za-z_][\w!]*)\b/ },
    { kind: "type", regex: /^(?:abstract|primitive)\s+type\s+([A-Za-z_][\w!]*)\b/ },
    { kind: "constant", regex: /^const\s+([A-Za-z_][\w!]*)\b/ },
  ],
  python: [
    { kind: "class", regex: /^class\s+([A-Za-z_][\w]*)\b/ },
    { kind: "function", regex: /^(?:async\s+)?def\s+([A-Za-z_][\w]*)\s*\(/ },
  ],
  typescript: [
    { kind: "class", regex: /^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)\b/ },
    { kind: "interface", regex: /^(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)\b/ },
    { kind: "type", regex: /^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\b/ },
    { kind: "function", regex: /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/ },
  ],
  javascript: [
    { kind: "class", regex: /^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)\b/ },
    { kind: "function", regex: /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/ },
    {
      kind: "constant",
      regex: /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/,
    },
  ],
  go: [
    { kind: "function", regex: /^func\s+(?:\([^)]+\)\s*)?([A-Za-z_][\w]*)\s*\(/ },
    { kind: "type", regex: /^type\s+([A-Za-z_][\w]*)\s+struct\b/ },
    { kind: "interface", regex: /^type\s+([A-Za-z_][\w]*)\s+interface\b/ },
  ],
  modelica: [
    {
      kind: "model",
      regex:
        /^(?:partial\s+)?(?:encapsulated\s+)?(?:model|block|class|function|package|record|connector|operator)\s+([A-Za-z_][\w]*)\b/,
    },
    { kind: "function", regex: /^function\s+([A-Za-z_][\w]*)\b/ },
  ],
};

function inferCodeOutlineLanguage(result: SearchResult): string | null {
  const explicit = normalizeText(result.codeLanguage)?.toLowerCase();
  if (explicit) {
    return explicit;
  }

  const path = normalizeText(result.navigationTarget?.path ?? result.path);
  if (!path) {
    return null;
  }

  const lower = path.toLowerCase();
  if (lower.endsWith(".jl")) return "julia";
  if (lower.endsWith(".rs")) return "rust";
  if (lower.endsWith(".py")) return "python";
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript";
  if (lower.endsWith(".go")) return "go";
  if (lower.endsWith(".mo")) return "modelica";
  return null;
}

function extractCodeOutline(content: string | null, result: SearchResult): StructuredChip[] {
  if (!content) {
    return [];
  }

  const language = inferCodeOutlineLanguage(result);
  const patterns = [
    ...(language ? (LANGUAGE_CODE_OUTLINE_PATTERNS[language] ?? []) : []),
    ...GENERIC_CODE_OUTLINE_PATTERNS,
  ];

  const outline: StructuredChip[] = [];
  const seen = new Set<string>();

  for (const line of content.split(/\r?\n/)) {
    const normalized = line.trim();
    if (!normalized) {
      continue;
    }

    for (const pattern of patterns) {
      const match = normalized.match(pattern.regex);
      const symbolName = match?.[1]?.trim();
      if (!symbolName) {
        continue;
      }

      const key = `${pattern.kind}:${symbolName}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      outline.push({
        label: pattern.kind,
        value: symbolName,
        query: symbolName,
      });
      break;
    }

    if (outline.length >= 8) {
      break;
    }
  }

  return outline;
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
      label: language,
      value: body.length > 180 ? `${body.slice(0, 177)}...` : body,
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
      value: body.length > 180 ? `${body.slice(0, 177)}...` : body,
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
        return excerpt.length > 220 ? `${excerpt.slice(0, 217)}...` : excerpt;
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
  return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
}

function buildMetadata(result: SearchResult): StructuredChip[] {
  const metadata: StructuredChip[] = [];
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
  append(
    "kind",
    result.codeKind ?? result.docType ?? undefined,
    result.codeKind ? `kind:${result.codeKind}` : undefined,
  );
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
  const codeOutline = isCodeSearchResult(selected) ? extractCodeOutline(content, selected) : [];
  const headings = codeOutline.length > 0 ? codeOutline : extractHeadings(content);
  const codeFragments = extractCodeFences(content);
  const mathFragments = extractMathFragments(content);
  const saliencyExcerpt = buildSaliencyExcerpt(selected, content);
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
      ...(saliencyExcerpt
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
