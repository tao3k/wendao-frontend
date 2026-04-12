import type { MermaidBundleReport } from "./mermaid-bundle-report-model.mjs";
import type { MermaidRuntimeProviderName } from "../../src/components/panels/mermaidRuntime";

export interface RunMermaidBundleReportOptions {
  readonly distDir?: string | undefined;
  readonly providerName?: MermaidRuntimeProviderName | undefined;
}

export function runMermaidBundleReport(
  options?: RunMermaidBundleReportOptions,
): Promise<MermaidBundleReport>;
