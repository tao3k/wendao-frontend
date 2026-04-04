import type { MermaidRuntimeProvider, MermaidRuntimeProviderName } from "./provider";
import { loadBeautifulMermaidProvider } from "./providers/beautifulMermaid";
import { loadCompactFlowProvider } from "./providers/compactFlow";

export const MERMAID_RENDER_THEME = {
  bg: "var(--tokyo-bg, #24283b)",
  fg: "var(--tokyo-text, #c0caf5)",
  accent: "var(--neon-blue, #7dcfff)",
  transparent: true,
} as const;

export const DEFAULT_MERMAID_RUNTIME_PROVIDER_NAME: MermaidRuntimeProviderName =
  "beautiful-mermaid";

const providerPromises = new Map<MermaidRuntimeProviderName, Promise<MermaidRuntimeProvider>>();

export function loadMermaidRuntimeProviderByName(
  providerName: MermaidRuntimeProviderName,
): Promise<MermaidRuntimeProvider> {
  const existing = providerPromises.get(providerName);
  if (existing) {
    return existing;
  }

  const next =
    providerName === "compact-flow" ? loadCompactFlowProvider() : loadBeautifulMermaidProvider();
  providerPromises.set(providerName, next);
  return next;
}

export function loadMermaidRuntimeProvider(
  providerName: MermaidRuntimeProviderName = DEFAULT_MERMAID_RUNTIME_PROVIDER_NAME,
): Promise<MermaidRuntimeProvider> {
  return loadMermaidRuntimeProviderByName(providerName);
}
