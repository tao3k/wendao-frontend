import type { RetrievalChunk, RetrievalChunkSurface } from "./studioBindings.generated";

export type * from "./studioBindings.generated";
export type * from "./projectionContracts";

export type MarkdownRetrievalAtom = RetrievalChunk;
export type CodeAstRetrievalAtom = RetrievalChunk;
export type CodeAstRetrievalAtomScope = RetrievalChunkSurface;

// PDF extraction result types (manual fallback until studioBindings is regenerated)
export interface PdfExtractResult {
  sourcePath: string;
  totalPages: number;
  extractedAt?: number;
  resources: PdfExtractResource[];
}

export interface PdfExtractResource {
  resourceType: string;
  resourcePath: string;
  pageIndex: number;
  caption: string;
  content: string;
  mimeType: string;
  status: string;
  elementId: string;
}
