import type { ZenSearchPreviewState } from "./useZenSearchPreview";

export function isMarkdownPreview(preview: ZenSearchPreviewState): boolean {
  const sourcePath = preview.contentPath ?? preview.selectedResult?.path ?? "";
  const contentType = preview.contentType?.toLowerCase() ?? "";

  return contentType.includes("markdown") || /\.(md|markdown)$/i.test(sourcePath);
}
