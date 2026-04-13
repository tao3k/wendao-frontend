import { describe, expect, it } from "vitest";

import {
  buildAsyncVendorChunkName,
  createSplitChunkCacheGroups,
  createSplitChunksConfig,
  normalizeChunkNameFragment,
  RSPACK_CACHE_GROUP_KEYS,
  RSPACK_MAX_ASYNC_CHUNK_SIZE,
} from "../../scripts/rspack/chunk-policy.mjs";

describe("normalizeChunkNameFragment", () => {
  it("sanitizes non chunk-safe characters", () => {
    expect(normalizeChunkNameFragment("zen search/preview")).toBe("zen_search_preview");
  });

  it("falls back to misc when the chunk name is absent", () => {
    expect(buildAsyncVendorChunkName([{ name: undefined }])).toBe("vendors-async-misc");
  });
});

describe("createSplitChunkCacheGroups", () => {
  it("exposes the expected named cache-group set", () => {
    const cacheGroups = createSplitChunkCacheGroups();

    expect(Object.keys(cacheGroups)).toEqual(RSPACK_CACHE_GROUP_KEYS);
  });

  it("keeps markdown-heavy groups async-splittable by responsibility", () => {
    const cacheGroups = createSplitChunkCacheGroups();

    expect(cacheGroups.markdownCore.name).toBe("markdown-core");
    expect(cacheGroups.markdownCore.chunks).toBe("async");
    expect(cacheGroups.imagePreview.name).toBe("image-preview");
    expect(cacheGroups.imagePreview.chunks).toBe("async");
    expect(cacheGroups.mediaPlayer.name).toBe("media-player");
    expect(cacheGroups.mediaPlayer.chunks).toBe("async");
    expect(cacheGroups.pdf.name).toBe("pdf");
    expect(cacheGroups.pdf.chunks).toBe("async");
    expect(cacheGroups.mermaidRuntime.name).toBe("mermaid-runtime");
    expect(cacheGroups.mermaidRuntime.chunks).toBe("async");
    expect(cacheGroups.katex.name).toBe("katex");
    expect(cacheGroups.katex.chunks).toBe("async");
  });

  it("derives async vendor chunk names through the shared helper", () => {
    const cacheGroups = createSplitChunkCacheGroups();
    const asyncVendorName = cacheGroups.vendorsAsync.name(null, [{ name: "zen search/preview" }]);

    expect(asyncVendorName).toBe("vendors-async-zen_search_preview");
  });
});

describe("createSplitChunksConfig", () => {
  it("caps async split chunks at the shared asset budget", () => {
    const splitChunks = createSplitChunksConfig();

    expect(splitChunks.chunks).toBe("all");
    expect(splitChunks.maxAsyncSize).toBe(RSPACK_MAX_ASYNC_CHUNK_SIZE);
    expect(splitChunks.maxAsyncSize).toBe(2_400_000);
    expect(Object.keys(splitChunks.cacheGroups)).toEqual(RSPACK_CACHE_GROUP_KEYS);
  });
});
