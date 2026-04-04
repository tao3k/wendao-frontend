import { describe, expect, it } from "vitest";

import {
  buildAsyncVendorChunkName,
  createSplitChunkCacheGroups,
  normalizeChunkNameFragment,
  RSPACK_CACHE_GROUP_KEYS,
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
    expect(cacheGroups.mermaid.name).toBe("mermaid");
    expect(cacheGroups.mermaid.chunks).toBe("async");
    expect(cacheGroups.katex.name).toBe("katex");
    expect(cacheGroups.katex.chunks).toBe("async");
  });

  it("derives async vendor chunk names through the shared helper", () => {
    const cacheGroups = createSplitChunkCacheGroups();
    const asyncVendorName = cacheGroups.vendorsAsync.name(null, [{ name: "zen search/preview" }]);

    expect(asyncVendorName).toBe("vendors-async-zen_search_preview");
  });
});
