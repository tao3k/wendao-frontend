export const RSPACK_CACHE_GROUP_KEYS = Object.freeze([
  "react",
  "three",
  "bpmn",
  "shikiCore",
  "markdownCore",
  "mermaid",
  "katex",
  "lucide",
  "vendors",
  "vendorsAsyncShared",
  "vendorsAsync",
  "common",
  "commonAsync",
]);

export function normalizeChunkNameFragment(value) {
  return String(value ?? "misc").replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function buildAsyncVendorChunkName(chunks) {
  const rawChunkName = String(chunks?.[0]?.name ?? "misc");
  return `vendors-async-${normalizeChunkNameFragment(rawChunkName)}`;
}

export function createSplitChunkCacheGroups() {
  return {
    react: {
      test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
      name: "react",
      chunks: "initial",
      priority: 40,
    },
    three: {
      test: /[\\/]node_modules[\\/](@react-three|three)[\\/]/,
      name: "three",
      chunks: "async",
      priority: 35,
      reuseExistingChunk: true,
    },
    bpmn: {
      test: /[\\/]node_modules[\\/](bpmn-js|bpmn-moddle|bpmn-auto-layout|diagram-js|min-dash|tiny-svg|moddle|moddle-xml|ids|path-intersection)[\\/]/,
      name: "bpmn",
      chunks: "async",
      priority: 34,
      reuseExistingChunk: true,
    },
    shikiCore: {
      test: /[\\/]node_modules[\\/]@shikijs[\\/](core|engine-oniguruma|primitive|types|vscode-textmate)[\\/]/,
      name: "shiki-core",
      chunks: "async",
      priority: 33.5,
      reuseExistingChunk: true,
    },
    markdownCore: {
      test: /[\\/]node_modules[\\/](react-markdown|remark-[^\\/]+|rehype-[^\\/]+)[\\/]/,
      name: "markdown-core",
      chunks: "async",
      priority: 33,
      reuseExistingChunk: true,
    },
    mermaid: {
      test: /[\\/]node_modules[\\/](beautiful-mermaid|mermaid|elkjs|web-worker)[\\/]/,
      name: "mermaid",
      chunks: "async",
      priority: 32.8,
      reuseExistingChunk: true,
    },
    katex: {
      test: /[\\/]node_modules[\\/]katex[\\/]/,
      name: "katex",
      chunks: "async",
      priority: 32.7,
      reuseExistingChunk: true,
    },
    lucide: {
      test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
      name: "lucide",
      chunks: "async",
      priority: 32.5,
      reuseExistingChunk: true,
    },
    vendors: {
      test: /[\\/]node_modules[\\/]/,
      name: "vendors",
      chunks: "initial",
      priority: 20,
      reuseExistingChunk: true,
    },
    vendorsAsyncShared: {
      test: /[\\/]node_modules[\\/]/,
      name: "vendors-async-shared",
      chunks: "async",
      minChunks: 4,
      priority: 16,
      reuseExistingChunk: true,
    },
    vendorsAsync: {
      test: /[\\/]node_modules[\\/]/,
      chunks: "async",
      minChunks: 1,
      name: (_module, chunks) => buildAsyncVendorChunkName(chunks),
      priority: 15,
      reuseExistingChunk: true,
    },
    common: {
      minChunks: 2,
      name: "common",
      chunks: "initial",
      priority: 10,
      reuseExistingChunk: true,
    },
    commonAsync: {
      minChunks: 2,
      name: "common-async",
      chunks: "async",
      priority: 9,
      reuseExistingChunk: true,
    },
  };
}
