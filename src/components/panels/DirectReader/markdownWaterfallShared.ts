import type { MarkdownAnalysisResponse } from "../../../api";

export type MarkdownWaterfallLocale = "en" | "zh";

export interface MarkdownWaterfallProps {
  content: string;
  path?: string;
  analysis?: MarkdownAnalysisResponse;
  locale?: MarkdownWaterfallLocale;
  onBiLinkClick?: (link: string) => void;
  onSectionPivot?: (query: string) => void;
}

export interface MarkdownWaterfallCopy {
  eyebrow: string;
  identityLabel: string;
  titleLabel: string;
  pathLabel: string;
  overviewLabel: string;
  sectionEmpty: string;
  chunkLabel: string;
  semanticLabel: string;
  fingerprintLabel: string;
  tokensLabel: string;
  copySectionLabel: string;
  copiedSectionLabel: string;
  pivotSectionLabel: string;
  tagsLabel: string;
  linkedLabel: string;
  updatedLabel: string;
  typeLabel: string;
  documentLabel: string;
  emptyMermaidBlock: string;
  mermaidRenderFailed: string;
  mermaidUnsupported: string;
  codeLabel: string;
  tableLabel: string;
  mermaidLabel: string;
  mathLabel: string;
  observationLabel: string;
}

export interface MarkdownAstNode {
  type?: string;
  value?: string;
  depth?: number;
  children?: MarkdownAstNode[];
  url?: string;
  alt?: string;
  position?: {
    start?: { offset?: number; line?: number };
    end?: { offset?: number; line?: number };
  };
}

export interface MarkdownFrontmatter {
  title?: string;
  tags: string[];
  linked: string[];
  updated?: string;
  type?: string;
}

export interface MarkdownRetrievalChunk {
  id: string;
  displayId: string;
  semanticType: string;
  fingerprint: string;
  tokenEstimate: number;
  displayLabel?: string;
  excerpt?: string;
}

export interface MarkdownSection {
  id: string;
  title: string;
  level: number;
  body: string;
  kind: "intro" | "section";
  lineStart?: number;
  lineEnd?: number;
  nodeId?: string;
  chunk: MarkdownRetrievalChunk;
}

export interface MarkdownWaterfallModel {
  title: string;
  pathLabel: string;
  frontmatter: MarkdownFrontmatter;
  sections: MarkdownSection[];
}

export const WATERFALL_COPY: Record<MarkdownWaterfallLocale, MarkdownWaterfallCopy> = {
  en: {
    eyebrow: "Markdown Waterfall",
    identityLabel: "Document Identity",
    titleLabel: "Title",
    pathLabel: "Path",
    overviewLabel: "Overview",
    sectionEmpty: "This section is empty.",
    chunkLabel: "Chunk",
    semanticLabel: "Semantic",
    fingerprintLabel: "Fingerprint",
    tokensLabel: "Tokens",
    copySectionLabel: "Copy for RAG",
    copiedSectionLabel: "Copied",
    pivotSectionLabel: "Pivot section",
    tagsLabel: "Tags",
    linkedLabel: "Linked",
    updatedLabel: "Updated",
    typeLabel: "Type",
    documentLabel: "Markdown document",
    emptyMermaidBlock: "Empty Mermaid block",
    mermaidRenderFailed: "Mermaid render failed",
    mermaidUnsupported: "Unsupported Mermaid dialect for inline render",
    codeLabel: "Code",
    tableLabel: "Table",
    mermaidLabel: "Mermaid",
    mathLabel: "Math",
    observationLabel: "Observation",
  },
  zh: {
    eyebrow: "Markdown 瀑布",
    identityLabel: "文档身份",
    titleLabel: "标题",
    pathLabel: "路径",
    overviewLabel: "概览",
    sectionEmpty: "此章节暂无内容。",
    chunkLabel: "块",
    semanticLabel: "语义",
    fingerprintLabel: "指纹",
    tokensLabel: "Token",
    copySectionLabel: "复制用于 RAG",
    copiedSectionLabel: "已复制",
    pivotSectionLabel: "聚焦章节",
    tagsLabel: "标签",
    linkedLabel: "关联",
    updatedLabel: "更新",
    typeLabel: "类型",
    documentLabel: "Markdown 文档",
    emptyMermaidBlock: "Mermaid 代码块为空",
    mermaidRenderFailed: "Mermaid 渲染失败",
    mermaidUnsupported: "当前内联渲染不支持的 Mermaid 方言",
    codeLabel: "代码",
    tableLabel: "表格",
    mermaidLabel: "Mermaid",
    mathLabel: "公式",
    observationLabel: "观察",
  },
};

export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return;
  }

  await navigator.clipboard.writeText(text);
}
