import type { MermaidRuntimeProvider, MermaidRuntimeProviderManifest } from "../provider";

export type BeautifulMermaidModule = typeof import("beautiful-mermaid");

export const BEAUTIFUL_MERMAID_PROVIDER_MANIFEST: MermaidRuntimeProviderManifest = {
  providerName: "beautiful-mermaid",
  packageName: "beautiful-mermaid",
  supportedInlineDialects: ["flowchart", "graph", "state", "unknown"],
  payloadNotes: [
    "Current inline flowchart/state rendering still routes through ELK-backed graph layout.",
    "The emitted payload frontier is dominated by mermaid.js, not the initial entrypoint.",
  ],
};

let beautifulMermaidProviderPromise: Promise<MermaidRuntimeProvider> | null = null;

export function loadBeautifulMermaidProvider(): Promise<MermaidRuntimeProvider> {
  if (!beautifulMermaidProviderPromise) {
    beautifulMermaidProviderPromise = import("beautiful-mermaid").then((module) => ({
      providerName: BEAUTIFUL_MERMAID_PROVIDER_MANIFEST.providerName,
      manifest: BEAUTIFUL_MERMAID_PROVIDER_MANIFEST,
      renderMermaid: module.renderMermaidSVG,
    }));
  }

  return beautifulMermaidProviderPromise;
}
