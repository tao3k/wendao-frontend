export const BEAUTIFUL_MERMAID_PROVIDER_MANIFEST = {
  providerName: "beautiful-mermaid",
  packageName: "beautiful-mermaid",
  payloadPackageNames: ["mermaid", "beautiful-mermaid", "elkjs"],
  payloadPackageGroups: [
    { groupName: "official-mermaid", packageNames: ["mermaid"] },
    { groupName: "layout-engine", packageNames: ["elkjs"] },
    { groupName: "provider-wrapper", packageNames: ["beautiful-mermaid"] },
  ],
  supportedInlineDialects: ["flowchart", "graph", "state", "unknown"],
  payloadNotes: [
    "Current inline flowchart/state rendering still routes through ELK-backed graph layout.",
    "The emitted payload frontier remains async-chunk dominated rather than initial-entrypoint dominated.",
  ],
};

export const COMPACT_FLOW_PROVIDER_MANIFEST = {
  providerName: "compact-flow",
  packageName: "local-compact-flow",
  payloadPackageNames: ["local-compact-flow"],
  payloadPackageGroups: [{ groupName: "provider-wrapper", packageNames: ["local-compact-flow"] }],
  supportedInlineDialects: ["flowchart", "graph", "state"],
  payloadNotes: [
    "Bounded spike provider: supports only simple arrow-connected flowchart/state diagrams.",
    "Does not depend on ELK or beautiful-mermaid.",
  ],
};

export const MERMAID_PROVIDER_MANIFESTS = {
  "beautiful-mermaid": BEAUTIFUL_MERMAID_PROVIDER_MANIFEST,
  "compact-flow": COMPACT_FLOW_PROVIDER_MANIFEST,
};

export const CURRENT_MERMAID_PROVIDER_MANIFEST = BEAUTIFUL_MERMAID_PROVIDER_MANIFEST;
