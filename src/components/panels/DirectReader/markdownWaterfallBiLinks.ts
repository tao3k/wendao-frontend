import type { Root } from "mdast";
import { defaultUrlTransform } from "react-markdown";
import type { Plugin } from "unified";
import type { VFile } from "vfile";
import type { MarkdownAstNode } from "./markdownWaterfallShared";

const BI_LINK_RE = /\[\[([^\]\n]+)\]\]/g;
const INTERNAL_URI_PREFIXES = ["wendao://", "$wendao://", "id:"] as const;

export function hasInternalUriPrefix(value: string): boolean {
  const lower = value.toLowerCase();
  return INTERNAL_URI_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function looksLikePathOrSemanticTarget(candidate: string): boolean {
  const value = candidate.trim();
  if (!value) {
    return false;
  }
  if (hasInternalUriPrefix(value)) {
    return true;
  }
  return (
    value.includes("/") ||
    value.includes("\\") ||
    value.includes(".") ||
    value.includes(":") ||
    value.includes("#") ||
    value.startsWith("~") ||
    value.startsWith("@")
  );
}

function parseBiLink(raw: string): { target: string; label: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const pipeIndex = trimmed.indexOf("|");
  if (pipeIndex < 0) {
    return { target: trimmed, label: trimmed };
  }

  const first = trimmed.slice(0, pipeIndex).trim();
  const second = trimmed.slice(pipeIndex + 1).trim();
  if (!first && !second) {
    return null;
  }
  if (!second) {
    return { target: first, label: first };
  }
  if (!first) {
    return { target: second, label: second };
  }

  const firstHasWhitespace = /\s/.test(first);
  const secondHasWhitespace = /\s/.test(second);
  if (
    (!looksLikePathOrSemanticTarget(first) && looksLikePathOrSemanticTarget(second)) ||
    (firstHasWhitespace && !secondHasWhitespace)
  ) {
    return { target: second, label: first };
  }
  return { target: first, label: second };
}

function buildValueToRawIndexMap(value: string, rawSource: string): number[] {
  const map = Array.from<number>({ length: value.length });
  let valueIndex = 0;
  let rawIndex = 0;

  while (valueIndex < value.length && rawIndex < rawSource.length) {
    if (
      rawSource[rawIndex] === "\\" &&
      rawIndex + 1 < rawSource.length &&
      rawSource[rawIndex + 1] === value[valueIndex]
    ) {
      rawIndex += 1;
    }

    map[valueIndex] = rawIndex;

    if (rawSource[rawIndex] === value[valueIndex]) {
      valueIndex += 1;
      rawIndex += 1;
      continue;
    }

    rawIndex += 1;
  }

  return map;
}

function isEscapedBiLinkInRaw(
  rawSource: string | null,
  valueToRawMap: number[] | null,
  matchStart: number,
): boolean {
  if (!rawSource || !valueToRawMap) {
    return false;
  }

  const rawIndex = valueToRawMap[matchStart];
  if (typeof rawIndex !== "number" || rawIndex <= 0) {
    return false;
  }
  return rawSource[rawIndex - 1] === "\\";
}

function isEmbeddedBiLink(source: string, matchStart: number): boolean {
  return matchStart > 0 && source[matchStart - 1] === "!";
}

function sliceNodeSource(node: MarkdownAstNode, source: string): string | null {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (typeof start !== "number" || typeof end !== "number") {
    return null;
  }
  return source.slice(start, end);
}

function transformBiLinks(node: MarkdownAstNode, source: string): void {
  if (!node.children || node.children.length === 0) {
    return;
  }

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];

    if (child.type === "text" && typeof child.value === "string") {
      const replacement = splitTextWithBiLinks(child.value, sliceNodeSource(child, source));
      if (replacement) {
        node.children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
        continue;
      }
    }

    transformBiLinks(child, source);
  }
}

function splitTextWithBiLinks(value: string, rawSource: string | null): MarkdownAstNode[] | null {
  BI_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null = BI_LINK_RE.exec(value);
  if (!match) {
    return null;
  }

  const nodes: MarkdownAstNode[] = [];
  let lastIndex = 0;
  const valueToRawMap = rawSource ? buildValueToRawIndexMap(value, rawSource) : null;

  while (match) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    if (isEscapedBiLinkInRaw(rawSource, valueToRawMap, matchStart)) {
      nodes.push({
        type: "text",
        value: value.slice(lastIndex, matchEnd),
      });
      lastIndex = matchEnd;
      match = BI_LINK_RE.exec(value);
      continue;
    }

    if (isEmbeddedBiLink(value, matchStart)) {
      nodes.push({
        type: "text",
        value: value.slice(lastIndex, matchEnd),
      });
      lastIndex = matchEnd;
      match = BI_LINK_RE.exec(value);
      continue;
    }

    if (matchStart > lastIndex) {
      nodes.push({
        type: "text",
        value: value.slice(lastIndex, matchStart),
      });
    }

    const parsed = parseBiLink(match[1]);
    if (parsed) {
      nodes.push({
        type: "link",
        url: `bilink:${encodeURIComponent(parsed.target)}`,
        children: [{ type: "text", value: parsed.label }],
      });
    } else {
      nodes.push({
        type: "text",
        value: match[0],
      });
    }

    lastIndex = matchEnd;
    match = BI_LINK_RE.exec(value);
  }

  if (lastIndex < value.length) {
    nodes.push({
      type: "text",
      value: value.slice(lastIndex),
    });
  }

  return nodes;
}

export function decodeBiLinkHref(href: string): string {
  const encoded = href.slice("bilink:".length);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export function directReaderUrlTransform(url: string): string {
  if (url.startsWith("bilink:") || hasInternalUriPrefix(url)) {
    return url;
  }
  return defaultUrlTransform(url);
}

export const remarkBiLinks: Plugin<[], Root> = () => {
  return (tree: Root, file: VFile) => {
    const source = typeof file?.value === "string" ? file.value : "";
    transformBiLinks(tree as unknown as MarkdownAstNode, source);
  };
};
