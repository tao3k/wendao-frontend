import type { MermaidRuntimeProvider, MermaidRuntimeProviderManifest } from "../provider";
import { renderCompactFlowSvg } from "./compactFlow/render";

export const COMPACT_FLOW_PROVIDER_MANIFEST: MermaidRuntimeProviderManifest = {
  providerName: "compact-flow",
  packageName: "local-compact-flow",
  supportedInlineDialects: ["flowchart", "graph", "state"],
  payloadNotes: [
    "Bounded spike provider: supports only simple arrow-connected flowchart/state diagrams.",
    "Does not depend on ELK or beautiful-mermaid.",
  ],
};

export async function loadCompactFlowProvider(): Promise<MermaidRuntimeProvider> {
  return {
    providerName: COMPACT_FLOW_PROVIDER_MANIFEST.providerName,
    manifest: COMPACT_FLOW_PROVIDER_MANIFEST,
    renderMermaid: renderCompactFlowSvg,
  };
}
