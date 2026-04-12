import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { PluggableList } from "unified";
import type { MarkdownRetrievalAtom as ApiMarkdownRetrievalAtom } from "../../../api";
import { remarkBiLinks } from "./markdownWaterfallBiLinks";
import { buildMarkdownComponents, directReaderUrlTransform } from "./markdownWaterfallComponents";
import type { MarkdownSection, MarkdownWaterfallCopy } from "./markdownWaterfallShared";

const MARKDOWN_WATERFALL_REMARK_PLUGINS: PluggableList = [
  remarkFrontmatter,
  remarkGfm,
  remarkMath,
  remarkBiLinks,
];
const MARKDOWN_WATERFALL_REHYPE_PLUGINS: PluggableList = [rehypeKatex];

interface MarkdownWaterfallSectionBodyProps {
  activeSection: MarkdownSection;
  analysisAtoms: ApiMarkdownRetrievalAtom[];
  content: string;
  copy: MarkdownWaterfallCopy;
  documentPathLabel: string;
  documentTitle: string;
  onBiLinkClick?: (link: string) => void;
  path?: string;
}

export const MarkdownWaterfallSectionBody: React.FC<MarkdownWaterfallSectionBodyProps> = ({
  activeSection,
  analysisAtoms,
  content,
  copy,
  documentPathLabel,
  documentTitle,
  onBiLinkClick,
  path,
}) => {
  return (
    <ReactMarkdown
      remarkPlugins={MARKDOWN_WATERFALL_REMARK_PLUGINS}
      rehypePlugins={MARKDOWN_WATERFALL_REHYPE_PLUGINS}
      urlTransform={directReaderUrlTransform}
      components={buildMarkdownComponents({
        onBiLinkClick,
        sourcePath: path,
        analysisAtoms,
        copy,
        documentTitle,
        documentPathLabel,
        documentContent: content,
        activeSection,
      })}
    >
      {activeSection.body}
    </ReactMarkdown>
  );
};

export default MarkdownWaterfallSectionBody;
