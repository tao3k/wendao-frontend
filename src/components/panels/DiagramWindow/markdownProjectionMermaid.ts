import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";

interface MarkdownAstNode {
  type?: string;
  value?: string;
  depth?: number;
  children?: MarkdownAstNode[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
}

type MarkdownFrontmatterNode = MarkdownAstNode & {
  type: "yaml" | "toml";
  value?: string;
};

type MarkdownHeadingNode = MarkdownAstNode & {
  type: "heading";
  depth: number;
};

interface MermaidNode {
  id: string;
  label: string;
}

interface MermaidEdge {
  from: string;
  to: string;
}

function extractMarkdownText(node: MarkdownAstNode | null | undefined): string {
  if (!node) {
    return "";
  }

  if (typeof node.value === "string") {
    return node.value;
  }

  if (!Array.isArray(node.children) || node.children.length === 0) {
    return "";
  }

  return node.children
    .map((child) => extractMarkdownText(child))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrontmatterTitle(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  for (const line of raw.split("\n")) {
    const match = /^title\s*:\s*(.+)$/i.exec(line.trim());
    if (!match) {
      continue;
    }

    const title = match[1].trim().replace(/^['"]|['"]$/g, "");
    return title || null;
  }

  return null;
}

function formatDocumentTitleFromPath(path?: string): string {
  if (!path) {
    return "Markdown document";
  }

  const segments = path.split("/");
  let lastSegment = "";
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const candidate = segments[index]?.trim();
    if (candidate) {
      lastSegment = candidate;
      break;
    }
  }

  const withoutExtension = lastSegment.replace(/\.(md|markdown)$/i, "");
  const normalized = withoutExtension.replace(/[-_]+/g, " ").trim();
  return normalized || "Markdown document";
}

function normalizeMermaidLabel(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, " ").trim() || fallback;
  if (normalized.length <= 72) {
    return normalized;
  }
  return `${normalized.slice(0, 69).trimEnd()}...`;
}

function escapeMermaidLabel(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getMarkdownOutline(
  content: string,
  path?: string,
): {
  title: string;
  headings: MarkdownHeadingNode[];
  hasOverview: boolean;
  firstHeadingActsAsTitle: boolean;
} {
  const root = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml", "toml"])
    .parse(content) as Root;
  const rootChildren = root.children as MarkdownAstNode[];
  const frontmatterNode = rootChildren.find(
    (node): node is MarkdownFrontmatterNode => node.type === "yaml" || node.type === "toml",
  );
  const headingNodes = rootChildren.filter(
    (node): node is MarkdownHeadingNode =>
      node.type === "heading" &&
      typeof node.depth === "number" &&
      node.depth >= 1 &&
      node.depth <= 6,
  );
  const frontmatterEnd = frontmatterNode?.position?.end?.offset ?? 0;
  const firstHeading = headingNodes[0] ?? null;
  const firstHeadingStart = firstHeading?.position?.start?.offset ?? content.length;
  const firstHeadingText = normalizeMermaidLabel(
    extractMarkdownText(firstHeading),
    formatDocumentTitleFromPath(path),
  );
  const title = parseFrontmatterTitle(frontmatterNode?.value) || firstHeadingText;
  const firstHeadingActsAsTitle = Boolean(
    firstHeading && firstHeading.depth === 1 && firstHeadingText === title,
  );
  const preHeadingBody = content.slice(frontmatterEnd, firstHeadingStart).trim();
  const titleOverviewBody = firstHeadingActsAsTitle
    ? content
        .slice(
          firstHeading?.position?.end?.offset ?? firstHeadingStart,
          headingNodes[1]?.position?.start?.offset ?? content.length,
        )
        .trim()
    : "";

  return {
    title,
    headings: headingNodes,
    hasOverview:
      preHeadingBody.length > 0 || titleOverviewBody.length > 0 || headingNodes.length === 0,
    firstHeadingActsAsTitle,
  };
}

export function buildMarkdownProjectionMermaid(content: string, path?: string): string | null {
  if (content.trim().length === 0) {
    return null;
  }

  const { title, headings, hasOverview, firstHeadingActsAsTitle } = getMarkdownOutline(
    content,
    path,
  );
  const nodes: MermaidNode[] = [{ id: "doc0", label: title }];
  const edges: MermaidEdge[] = [];
  const stack: Array<{ depth: number; id: string }> = [{ depth: 0, id: "doc0" }];
  let nextNodeId = 1;
  let headingStartIndex = 0;

  if (hasOverview) {
    const overviewId = `sec${nextNodeId}`;
    nextNodeId += 1;
    nodes.push({ id: overviewId, label: "Overview" });
    edges.push({ from: "doc0", to: overviewId });
  }

  if (firstHeadingActsAsTitle) {
    headingStartIndex = 1;
  }

  headings.slice(headingStartIndex).forEach((heading, index) => {
    const label = normalizeMermaidLabel(
      extractMarkdownText(heading),
      `Section ${headingStartIndex + index + 1}`,
    );
    const nodeId = `sec${nextNodeId}`;
    nextNodeId += 1;

    while (stack.length > 1 && stack[stack.length - 1]!.depth >= heading.depth) {
      stack.pop();
    }

    const parentId = stack[stack.length - 1]?.id ?? "doc0";
    nodes.push({ id: nodeId, label });
    edges.push({ from: parentId, to: nodeId });
    stack.push({ depth: heading.depth, id: nodeId });
  });

  return [
    "flowchart TD",
    ...nodes.map((node) => `  ${node.id}["${escapeMermaidLabel(node.label)}"]`),
    ...edges.map((edge) => `  ${edge.from} --> ${edge.to}`),
  ].join("\n");
}
