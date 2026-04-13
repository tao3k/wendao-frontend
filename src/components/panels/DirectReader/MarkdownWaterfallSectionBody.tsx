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

interface MarkdownWaterfallMarkdownProps {
  body: string;
  components: Parameters<typeof ReactMarkdown>[0]["components"];
}

interface MarkdownComponentsCacheArgs {
  activeSection: MarkdownSection;
  analysisAtoms: ApiMarkdownRetrievalAtom[];
  content: string;
  copy: MarkdownWaterfallCopy;
  documentPathLabel: string;
  documentTitle: string;
  hasBiLinkHandler: boolean;
  path?: string;
}

const MarkdownWaterfallMarkdown = React.memo(function MarkdownWaterfallMarkdown({
  body,
  components,
}: MarkdownWaterfallMarkdownProps): React.ReactElement {
  return (
    <ReactMarkdown
      remarkPlugins={MARKDOWN_WATERFALL_REMARK_PLUGINS}
      rehypePlugins={MARKDOWN_WATERFALL_REHYPE_PLUGINS}
      urlTransform={directReaderUrlTransform}
      components={components}
    >
      {body}
    </ReactMarkdown>
  );
});

function equalMarkdownComponentsCacheArgs(
  left: MarkdownComponentsCacheArgs | undefined,
  right: MarkdownComponentsCacheArgs,
): boolean {
  return (
    left?.activeSection === right.activeSection &&
    left?.analysisAtoms === right.analysisAtoms &&
    left?.content === right.content &&
    left?.copy === right.copy &&
    left?.documentPathLabel === right.documentPathLabel &&
    left?.documentTitle === right.documentTitle &&
    left?.hasBiLinkHandler === right.hasBiLinkHandler &&
    left?.path === right.path
  );
}

function createMarkdownComponentsController(): {
  update(
    args: MarkdownComponentsCacheArgs & {
      onBiLinkClick?: (link: string) => void;
    },
  ): NonNullable<MarkdownWaterfallMarkdownProps["components"]>;
} {
  let cachedArgs: MarkdownComponentsCacheArgs | undefined;
  let cachedComponents: NonNullable<MarkdownWaterfallMarkdownProps["components"]> | undefined;
  let onBiLinkClickRef: ((link: string) => void) | undefined;

  const stableBiLinkClick = (link: string): void => {
    onBiLinkClickRef?.(link);
  };

  return {
    update({
      activeSection,
      analysisAtoms,
      content,
      copy,
      documentPathLabel,
      documentTitle,
      hasBiLinkHandler,
      onBiLinkClick,
      path,
    }) {
      onBiLinkClickRef = onBiLinkClick;

      const nextArgs: MarkdownComponentsCacheArgs = {
        activeSection,
        analysisAtoms,
        content,
        copy,
        documentPathLabel,
        documentTitle,
        hasBiLinkHandler,
        path,
      };

      if (!equalMarkdownComponentsCacheArgs(cachedArgs, nextArgs)) {
        cachedComponents = buildMarkdownComponents({
          onBiLinkClick: hasBiLinkHandler ? stableBiLinkClick : undefined,
          sourcePath: path,
          analysisAtoms,
          copy,
          documentTitle,
          documentPathLabel,
          documentContent: content,
          activeSection,
        });
        cachedArgs = nextArgs;
      }

      return cachedComponents ?? {};
    },
  };
}

function MarkdownWaterfallSectionBodyComponent({
  activeSection,
  analysisAtoms,
  content,
  copy,
  documentPathLabel,
  documentTitle,
  onBiLinkClick,
  path,
}: MarkdownWaterfallSectionBodyProps): React.ReactElement {
  const hasBiLinkHandler = typeof onBiLinkClick === "function";
  const componentsController = React.useMemo(createMarkdownComponentsController, []);
  const components = componentsController.update({
    activeSection,
    analysisAtoms,
    content,
    copy,
    documentTitle,
    documentPathLabel,
    hasBiLinkHandler,
    onBiLinkClick,
    path,
  });

  return <MarkdownWaterfallMarkdown body={activeSection.body} components={components} />;
}

export const MarkdownWaterfallSectionBody = React.memo(MarkdownWaterfallSectionBodyComponent);

MarkdownWaterfallMarkdown.displayName = "MarkdownWaterfallMarkdown";
MarkdownWaterfallSectionBody.displayName = "MarkdownWaterfallSectionBody";

export default MarkdownWaterfallSectionBody;
