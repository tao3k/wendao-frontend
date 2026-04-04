export interface MermaidRenderTheme {
  readonly bg: string;
  readonly fg: string;
  readonly accent: string;
  readonly transparent: boolean;
}

export type MermaidRuntimeProviderName = "beautiful-mermaid" | "compact-flow";

export type MermaidInlineDialect = "flowchart" | "graph" | "state" | "unknown";

export interface MermaidRuntimeProviderManifest {
  readonly providerName: MermaidRuntimeProviderName;
  readonly packageName: string;
  readonly supportedInlineDialects: readonly MermaidInlineDialect[];
  readonly payloadNotes: readonly string[];
}

export type MermaidRenderFunction = (source: string, theme: MermaidRenderTheme) => string;

export interface MermaidRuntimeProvider {
  readonly providerName: MermaidRuntimeProviderName;
  readonly manifest: MermaidRuntimeProviderManifest;
  readonly renderMermaid: MermaidRenderFunction;
}
