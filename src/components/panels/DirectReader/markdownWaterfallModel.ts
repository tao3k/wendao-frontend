import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type {
  MarkdownAnalysisDocumentLink as ApiMarkdownAnalysisDocumentLink,
  MarkdownAnalysisDocumentMetadata as ApiMarkdownAnalysisDocumentMetadata,
  MarkdownRetrievalAtom as ApiMarkdownRetrievalAtom,
} from "../../../api";
import {
  buildArrowRetrievalLookup,
  type ArrowRetrievalLookup,
} from "../../../utils/arrowRetrievalLookup";
import type {
  MarkdownDocumentIdentity,
  MarkdownIdentityLink,
  MarkdownAstNode,
  MarkdownFrontmatter,
  MarkdownRetrievalChunk,
  MarkdownSection,
  MarkdownWaterfallCopy,
  MarkdownWaterfallLocale,
  MarkdownWaterfallModel,
} from "./markdownWaterfallShared";

type MarkdownFrontmatterAstNode = MarkdownAstNode & {
  type: "yaml" | "toml";
  value?: string;
};

type MarkdownHeadingAstNode = MarkdownAstNode & {
  type: "heading";
  depth: number;
};

function extractMarkdownText(node: MarkdownAstNode | null | undefined): string {
  if (!node) {
    return "";
  }

  if (typeof node.value === "string") {
    return node.value;
  }

  if (!node.children || node.children.length === 0) {
    return "";
  }

  return node.children
    .map((child) => extractMarkdownText(child))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDelimitedFrontmatter(raw: string | undefined): MarkdownFrontmatter {
  const metadata: MarkdownFrontmatter = {
    tags: [],
    linked: [],
  };

  if (!raw) {
    return metadata;
  }

  const lines = raw.split("\n");
  let activeListKey: "tags" | "linked" | null = null;

  const pushListValues = (key: "tags" | "linked", value: string) => {
    const normalized = value.trim().replace(/^\[|\]$/g, "");
    if (!normalized) {
      return;
    }

    normalized
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean)
      .forEach((item) => {
        metadata[key].push(item);
      });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      activeListKey = null;
      continue;
    }

    const listItem = /^[-*]\s+(.*)$/.exec(trimmed);
    if (listItem && activeListKey) {
      metadata[activeListKey].push(listItem[1].trim().replace(/^['"]|['"]$/g, ""));
      continue;
    }

    const keyMatch = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(trimmed);
    if (!keyMatch) {
      activeListKey = null;
      continue;
    }

    const key = keyMatch[1].toLowerCase();
    const value = keyMatch[2].trim();

    if (key === "title" || key === "updated" || key === "type") {
      metadata[key] = value.replace(/^['"]|['"]$/g, "");
      activeListKey = null;
      continue;
    }

    if (key === "tags" || key === "linked" || key === "links" || key === "related") {
      activeListKey = key === "tags" ? "tags" : "linked";
      if (value) {
        pushListValues(activeListKey, value);
      }
      continue;
    }

    activeListKey = null;
  }

  metadata.tags = Array.from(new Set(metadata.tags));
  metadata.linked = Array.from(new Set(metadata.linked));

  return metadata;
}

function resolveAnalysisLinkTarget(link: ApiMarkdownAnalysisDocumentLink): string | null {
  const normalizedAddress = link.targetAddress?.trim() ?? undefined;
  if (link.docId) {
    return `id:${link.docId}${normalizedAddress ?? ""}`;
  }
  if (link.path) {
    return `${link.path}${normalizedAddress ?? ""}`;
  }
  return null;
}

function toMarkdownIdentityLink(
  link: ApiMarkdownAnalysisDocumentLink,
): MarkdownIdentityLink | null {
  const target = resolveAnalysisLinkTarget(link);
  if (!target) {
    return null;
  }

  return {
    label: link.label,
    target,
    kind: link.kind,
    title: link.title ?? undefined,
    path: link.path ?? undefined,
    relationType: link.relationType ?? undefined,
    metadataOwner: link.metadataOwner ?? undefined,
    targetAddress: link.targetAddress ?? undefined,
  };
}

function isMarkdownIdentityLink(value: MarkdownIdentityLink | null): value is MarkdownIdentityLink {
  return value !== null;
}

function buildIdentityFromFrontmatter(
  frontmatter: MarkdownFrontmatter,
  title: string,
): MarkdownDocumentIdentity {
  return {
    title,
    tags: frontmatter.tags,
    linked: frontmatter.linked.map((item) => ({
      label: item,
      target: item,
      kind: "index",
    })),
    backlinks: [],
    parent: undefined,
    updated: frontmatter.updated,
    type: frontmatter.type,
  };
}

function buildDocumentIdentity(args: {
  frontmatter: MarkdownFrontmatter;
  fallbackTitle: string;
  metadata?: ApiMarkdownAnalysisDocumentMetadata;
}): MarkdownDocumentIdentity {
  const { fallbackTitle, frontmatter, metadata } = args;
  if (!metadata) {
    return buildIdentityFromFrontmatter(frontmatter, fallbackTitle);
  }

  const metadataTags = metadata.tags ?? [];
  const metadataOutgoingLinks = metadata.outgoingLinks ?? [];
  const metadataBacklinks = metadata.backlinks ?? [];

  return {
    title: metadata.title || fallbackTitle,
    tags: metadataTags.length > 0 ? metadataTags : frontmatter.tags,
    linked:
      metadataOutgoingLinks.length > 0
        ? metadataOutgoingLinks.map(toMarkdownIdentityLink).filter(isMarkdownIdentityLink)
        : frontmatter.linked.map((item) => ({
            label: item,
            target: item,
            kind: "index",
          })),
    backlinks: metadataBacklinks.map(toMarkdownIdentityLink).filter(isMarkdownIdentityLink),
    parent: metadata.parent ? (toMarkdownIdentityLink(metadata.parent) ?? undefined) : undefined,
    updated: metadata.updated ?? frontmatter.updated,
    type: metadata.docType ?? frontmatter.type,
  };
}

function formatDisplayPath(path?: string): string {
  if (!path) {
    return "";
  }

  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 4) {
    return path;
  }

  return `${segments[0]}/${segments[1]}/.../${segments[segments.length - 1]}`;
}

function formatDocumentTitleFromPath(path?: string): string {
  if (!path) {
    return "Markdown document";
  }

  const segments = path.split("/");
  let lastSegment = "";
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index]?.trim();
    if (segment) {
      lastSegment = segment;
      break;
    }
  }
  const withoutExtension = lastSegment.replace(/\.(md|markdown)$/i, "");
  const normalized = withoutExtension.replace(/[-_]+/g, " ").trim();
  return normalized || "Markdown document";
}

export function formatSectionLabel(
  locale: MarkdownWaterfallLocale,
  level: number,
  index: number,
): string {
  const prefix = locale === "zh" ? "章节" : "Section";
  const levelLabel = `H${Math.min(Math.max(level, 1), 6)}`;
  return `${prefix} ${index + 1} · ${levelLabel}`;
}

export function slugifySectionPath(path?: string): string {
  if (!path) {
    return "document";
  }

  const segments = path.split("/");
  let segment = "document";
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const candidate = segments[index]?.trim();
    if (candidate) {
      segment = candidate;
      break;
    }
  }
  return (
    segment
      .replace(/\.(md|markdown)$/i, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "document"
  );
}

export function buildStableFingerprint(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return `fp:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function estimateTokenCount(value: string): number {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}

function buildMarkdownRetrievalChunk(
  path: string | undefined,
  section: Omit<MarkdownSection, "chunk">,
  index: number,
): MarkdownRetrievalChunk {
  const pathSlug = slugifySectionPath(path);
  const semanticType =
    section.kind === "intro" ? "overview" : `h${Math.min(Math.max(section.level, 1), 6)}`;
  const chunkId = `md:${pathSlug}:${section.id}`;
  const fingerprint = buildStableFingerprint(
    [path ?? "", section.id, section.title, semanticType, section.body.slice(0, 240)].join("|"),
  );

  return {
    id: chunkId,
    displayId: `md:${String(index + 1).padStart(2, "0")}`,
    semanticType,
    fingerprint,
    tokenEstimate: estimateTokenCount(section.body || section.title),
    displayLabel: section.kind === "intro" ? undefined : section.title,
    excerpt: section.body,
  };
}

function buildMarkdownAtomLookup(
  retrievalAtoms: ApiMarkdownRetrievalAtom[] | undefined,
): ArrowRetrievalLookup<ApiMarkdownRetrievalAtom> {
  return buildArrowRetrievalLookup(retrievalAtoms ?? []);
}

export function toDisplayMarkdownChunk(
  atom: ApiMarkdownRetrievalAtom,
  displayId: string,
): MarkdownRetrievalChunk {
  return {
    id: atom.chunkId,
    displayId,
    semanticType: atom.semanticType,
    fingerprint: atom.fingerprint,
    tokenEstimate: atom.tokenEstimate,
    displayLabel: atom.displayLabel ?? undefined,
    excerpt: atom.excerpt ?? undefined,
  };
}

function resolveMarkdownRetrievalChunk(
  atomLookup: ArrowRetrievalLookup<ApiMarkdownRetrievalAtom>,
  section: Omit<MarkdownSection, "chunk">,
  path: string | undefined,
  index: number,
): MarkdownRetrievalChunk {
  const backendAtom = section.nodeId ? atomLookup.findByOwner(section.nodeId) : undefined;
  if (backendAtom) {
    return toDisplayMarkdownChunk(backendAtom, `md:${String(index + 1).padStart(2, "0")}`);
  }

  return buildMarkdownRetrievalChunk(path, section, index);
}

export function buildMarkdownRichSlotDisplayId(semanticType: string, lineStart: number): string {
  if (semanticType === "mermaid") {
    return `mdm:${lineStart}`;
  }
  if (semanticType === "table") {
    return `mdt:${lineStart}`;
  }
  if (semanticType === "observation") {
    return `mdo:${lineStart}`;
  }
  if (semanticType === "math:block") {
    return `mdq:${lineStart}`;
  }
  if (semanticType.startsWith("code:") || semanticType === "code") {
    return `mdc:${lineStart}`;
  }
  return `mdr:${lineStart}`;
}

export function buildMarkdownRichSlotChunk(
  path: string | undefined,
  ownerId: string,
  semanticType: string,
  body: string,
  lineStart: number,
): MarkdownRetrievalChunk {
  const chunkId = `md:${slugifySectionPath(path)}:${ownerId.replace(":", "-")}`;
  const fingerprint = buildStableFingerprint(
    [path ?? "", ownerId, semanticType, body.slice(0, 240)].join("|"),
  );

  return {
    id: chunkId,
    displayId: buildMarkdownRichSlotDisplayId(semanticType, lineStart),
    semanticType,
    fingerprint,
    tokenEstimate: estimateTokenCount(body),
    excerpt: body,
  };
}

export function sliceMarkdownContentLines(
  content: string,
  lineStart: number,
  lineEnd: number,
): string {
  const start = Math.max(1, lineStart);
  const end = Math.max(start, lineEnd);

  return content
    .split(/\r?\n/)
    .filter((_, index) => {
      const lineNo = index + 1;
      return lineNo >= start && lineNo <= end;
    })
    .join("\n")
    .trim();
}

function stripMarkdownCodeFence(excerpt: string): string {
  const lines = excerpt.split(/\r?\n/);
  if (lines.length >= 2 && lines[0]?.trim().startsWith("```") && lines.at(-1)?.trim() === "```") {
    return lines.slice(1, -1).join("\n").trim();
  }
  return excerpt.trim();
}

export function findMarkdownRichSlotAtom(args: {
  atomLookup: ArrowRetrievalLookup<ApiMarkdownRetrievalAtom>;
  content: string;
  section: MarkdownSection;
  semanticType: string;
  body: string;
}): ApiMarkdownRetrievalAtom | undefined {
  const { atomLookup, content, section, semanticType, body } = args;
  const normalizedBody = body.trim();
  if (typeof section.lineStart !== "number" || typeof section.lineEnd !== "number") {
    return undefined;
  }

  return atomLookup
    .collectBySemanticTypeInRange(semanticType, section.lineStart, section.lineEnd)
    .find((atom) => {
      const excerpt = stripMarkdownCodeFence(
        sliceMarkdownContentLines(
          content,
          atom.lineStart ?? 1,
          atom.lineEnd ?? atom.lineStart ?? 1,
        ),
      );
      return excerpt === normalizedBody;
    });
}

export function collectSectionAtoms(
  atomLookup: ArrowRetrievalLookup<ApiMarkdownRetrievalAtom>,
  section: MarkdownSection,
  semanticType: string,
): ApiMarkdownRetrievalAtom[] {
  if (typeof section.lineStart !== "number" || typeof section.lineEnd !== "number") {
    return [];
  }

  return atomLookup.collectBySemanticTypeInRange(semanticType, section.lineStart, section.lineEnd);
}

export function buildSectionTitle(section: MarkdownSection, copy: MarkdownWaterfallCopy): string {
  return section.kind === "intro" ? copy.overviewLabel : section.title;
}

export function buildSectionCopyPayload(
  model: MarkdownWaterfallModel,
  section: MarkdownSection,
  copy: MarkdownWaterfallCopy,
): string {
  const tags = model.identity.tags.length > 0 ? model.identity.tags.join(", ") : "";
  const linked =
    model.identity.linked.length > 0
      ? model.identity.linked.map((item) => item.label).join(", ")
      : "";
  const backlinks =
    model.identity.backlinks.length > 0
      ? model.identity.backlinks.map((item) => item.label).join(", ")
      : "";
  const parent = model.identity.parent?.label ?? "";
  const sectionTitle = buildSectionTitle(section, copy);
  const sectionBody = section.chunk.excerpt?.trim() || section.body || copy.sectionEmpty;

  return [
    `Title: ${model.title}`,
    `Section: ${sectionTitle}`,
    `Chunk: ${section.chunk.id}`,
    `Semantic: ${section.chunk.semanticType}`,
    `Fingerprint: ${section.chunk.fingerprint}`,
    `Tokens: ~${section.chunk.tokenEstimate}`,
    model.pathLabel ? `Path: ${model.pathLabel}` : null,
    tags ? `Tags: ${tags}` : null,
    linked ? `${copy.linkedLabel}: ${linked}` : null,
    parent ? `${copy.parentLabel}: ${parent}` : null,
    backlinks ? `${copy.backlinksLabel}: ${backlinks}` : null,
    "",
    sectionBody,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n")
    .trim();
}

export function buildSectionPivotQuery(
  model: MarkdownWaterfallModel,
  section: MarkdownSection,
  copy: MarkdownWaterfallCopy,
): string {
  return [model.title, buildSectionTitle(section, copy), model.pathLabel]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function buildMarkdownRichSlotCopyPayload(args: {
  title: string;
  pathLabel: string;
  slotLabel: string;
  chunk: MarkdownRetrievalChunk;
  body: string;
}): string {
  const { title, pathLabel, slotLabel, chunk, body } = args;
  const slotBody = chunk.excerpt?.trim() || body;

  return [
    `Title: ${title}`,
    `Slot: ${slotLabel}`,
    `Chunk: ${chunk.id}`,
    `Semantic: ${chunk.semanticType}`,
    `Fingerprint: ${chunk.fingerprint}`,
    `Tokens: ~${chunk.tokenEstimate}`,
    pathLabel ? `Path: ${pathLabel}` : null,
    "",
    slotBody,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n")
    .trim();
}

export function buildMarkdownWaterfallModel(
  content: string,
  path?: string,
  retrievalAtoms?: ApiMarkdownRetrievalAtom[],
  documentMetadata?: ApiMarkdownAnalysisDocumentMetadata,
): MarkdownWaterfallModel {
  const root = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml", "toml"])
    .parse(content) as Root;
  const rootChildren = root.children as MarkdownAstNode[];

  const frontmatterNode = rootChildren.find(
    (node): node is MarkdownFrontmatterAstNode => node.type === "yaml" || node.type === "toml",
  );
  const frontmatter = parseDelimitedFrontmatter(frontmatterNode?.value);
  const frontmatterEnd = frontmatterNode?.position?.end?.offset ?? 0;
  const headingNodes = rootChildren.filter(
    (node): node is MarkdownHeadingAstNode =>
      node.type === "heading" && typeof node.depth === "number" && node.depth <= 2,
  );
  const atomLookup = buildMarkdownAtomLookup(retrievalAtoms);
  const totalLines = content.split(/\r?\n/).length || 1;
  const firstHeading = headingNodes[0] ?? null;
  const hasExplicitDocumentTitle = Boolean(frontmatter.title);
  const title =
    documentMetadata?.title ||
    frontmatter.title ||
    extractMarkdownText(firstHeading) ||
    formatDocumentTitleFromPath(path);
  const identity = buildDocumentIdentity({
    frontmatter,
    fallbackTitle: title,
    metadata: documentMetadata,
  });

  const sections: Array<Omit<MarkdownSection, "chunk">> = [];
  const firstHeadingStart = firstHeading?.position?.start?.offset ?? content.length;

  if (headingNodes.length === 0) {
    const body = content.slice(frontmatterEnd).trim();
    if (body) {
      sections.push({
        id: "markdown-waterfall-body",
        title: "Overview",
        level: 2,
        body,
        kind: "intro",
        lineStart: 1,
        lineEnd: totalLines,
        nodeId: "doc:0",
      });
    }
  } else if (!hasExplicitDocumentTitle && firstHeading) {
    const nextHeading = headingNodes[1] ?? null;
    const preface = content.slice(frontmatterEnd, firstHeadingStart).trim();
    const firstBody = content
      .slice(
        firstHeading.position?.end?.offset ?? 0,
        nextHeading?.position?.start?.offset ?? content.length,
      )
      .trim();
    const combinedBody = [preface, firstBody].filter(Boolean).join("\n\n").trim();

    if (combinedBody) {
      sections.push({
        id: "markdown-waterfall-overview",
        title: "Overview",
        level: 2,
        body: combinedBody,
        kind: "intro",
      });
    }

    headingNodes.slice(1).forEach((heading, index) => {
      const next = headingNodes[index + 2] ?? null;
      const bodyStart = heading.position?.end?.offset ?? 0;
      const bodyEnd = next?.position?.start?.offset ?? content.length;
      const body = content.slice(bodyStart, bodyEnd).trim();
      const lineStart = heading.position?.start?.line ?? 1;
      const lineEnd = Math.max(lineStart, (next?.position?.start?.line ?? totalLines + 1) - 1);

      sections.push({
        id: `markdown-waterfall-section-${index + 2}`,
        title: extractMarkdownText(heading) || `Section ${index + 2}`,
        level: heading.depth ?? 2,
        body,
        kind: "section",
        lineStart,
        lineEnd,
        nodeId: `sec:${lineStart}`,
      });
    });
  } else {
    const introBody = content.slice(frontmatterEnd, firstHeadingStart).trim();

    if (introBody) {
      sections.push({
        id: "markdown-waterfall-overview",
        title: "Overview",
        level: 2,
        body: introBody,
        kind: "intro",
      });
    }

    headingNodes.forEach((heading, index) => {
      const nextHeading = headingNodes[index + 1] ?? null;
      const bodyStart = heading.position?.end?.offset ?? 0;
      const bodyEnd = nextHeading?.position?.start?.offset ?? content.length;
      const body = content.slice(bodyStart, bodyEnd).trim();
      const lineStart = heading.position?.start?.line ?? 1;
      const lineEnd = Math.max(
        lineStart,
        (nextHeading?.position?.start?.line ?? totalLines + 1) - 1,
      );

      sections.push({
        id: `markdown-waterfall-section-${index + 1}`,
        title: extractMarkdownText(heading) || `Section ${index + 1}`,
        level: heading.depth ?? 2,
        body,
        kind: "section",
        lineStart,
        lineEnd,
        nodeId: `sec:${lineStart}`,
      });
    });
  }

  return {
    title,
    pathLabel: formatDisplayPath(path),
    frontmatter,
    identity,
    sections: sections.map((section, index) => ({
      id: section.id,
      title: section.title,
      level: section.level,
      body: section.body,
      kind: section.kind,
      lineStart: section.lineStart,
      lineEnd: section.lineEnd,
      nodeId: section.nodeId,
      chunk: resolveMarkdownRetrievalChunk(atomLookup, section, path, index),
    })),
  };
}
