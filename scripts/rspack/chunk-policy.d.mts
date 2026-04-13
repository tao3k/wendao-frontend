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
  readonly imagePreview: NamedSplitChunkCacheGroup;
  readonly mediaPlayer: NamedSplitChunkCacheGroup;
  readonly pdf: NamedSplitChunkCacheGroup;
  readonly mermaidRuntime: NamedSplitChunkCacheGroup;
  readonly katex: NamedSplitChunkCacheGroup;
  readonly lucide: NamedSplitChunkCacheGroup;
  readonly vendors: NamedSplitChunkCacheGroup;
  readonly vendorsAsyncShared: NamedSplitChunkCacheGroup;
  readonly vendorsAsync: DynamicNamedSplitChunkCacheGroup;
  readonly common: NamedSplitChunkCacheGroup;
  readonly commonAsync: NamedSplitChunkCacheGroup;
}

export interface SplitChunksConfig {
  readonly chunks: "all";
  readonly maxAsyncSize: number;
  readonly cacheGroups: SplitChunkCacheGroups;
}

export const RSPACK_CACHE_GROUP_KEYS: readonly (keyof SplitChunkCacheGroups)[];
export const RSPACK_MAX_ASYNC_CHUNK_SIZE: number;

export function normalizeChunkNameFragment(value: unknown): string;
export function buildAsyncVendorChunkName(chunks?: readonly ChunkLike[]): string;
export function createSplitChunkCacheGroups(): SplitChunkCacheGroups;
export function createSplitChunksConfig(): SplitChunksConfig;
