import type { RetrievalChunk, RetrievalChunkSurface } from "./studioBindings.generated";

export type * from "./studioBindings.generated";
export type * from "./projectionContracts";

export type MarkdownRetrievalAtom = RetrievalChunk;
export type CodeAstRetrievalAtom = RetrievalChunk;
export type CodeAstRetrievalAtomScope = RetrievalChunkSurface;
