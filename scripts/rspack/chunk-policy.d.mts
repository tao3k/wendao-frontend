export interface ChunkLike {
  readonly name?: string | null | undefined;
}

export interface SplitChunkCacheGroup {
  readonly test?: RegExp;
  readonly name: string | ((module: unknown, chunks?: readonly ChunkLike[]) => string);
  readonly chunks: "initial" | "async";
  readonly priority: number;
  readonly reuseExistingChunk?: boolean;
  readonly minChunks?: number;
}

export interface NamedSplitChunkCacheGroup extends SplitChunkCacheGroup {
  readonly name: string;
}

export interface DynamicNamedSplitChunkCacheGroup extends SplitChunkCacheGroup {
  readonly name: (module: unknown, chunks?: readonly ChunkLike[]) => string;
}

export interface SplitChunkCacheGroups {
  readonly react: NamedSplitChunkCacheGroup;
  readonly three: NamedSplitChunkCacheGroup;
  readonly bpmn: NamedSplitChunkCacheGroup;
  readonly shikiCore: NamedSplitChunkCacheGroup;
  readonly markdownCore: NamedSplitChunkCacheGroup;
  readonly mermaid: NamedSplitChunkCacheGroup;
  readonly katex: NamedSplitChunkCacheGroup;
  readonly lucide: NamedSplitChunkCacheGroup;
  readonly vendors: NamedSplitChunkCacheGroup;
  readonly vendorsAsyncShared: NamedSplitChunkCacheGroup;
  readonly vendorsAsync: DynamicNamedSplitChunkCacheGroup;
  readonly common: NamedSplitChunkCacheGroup;
  readonly commonAsync: NamedSplitChunkCacheGroup;
}

export const RSPACK_CACHE_GROUP_KEYS: readonly (keyof SplitChunkCacheGroups)[];

export function normalizeChunkNameFragment(value: unknown): string;
export function buildAsyncVendorChunkName(chunks?: readonly ChunkLike[]): string;
export function createSplitChunkCacheGroups(): SplitChunkCacheGroups;
