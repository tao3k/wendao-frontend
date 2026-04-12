import type { MermaidRuntimeProviderManifest } from "../../src/components/panels/mermaidRuntime";

export interface MermaidBundleAsset {
  readonly asset: string;
  readonly size: number;
}

export interface BuildMermaidBundleReportInput {
  readonly fileSizes: Record<string, number>;
  readonly providerManifest?: MermaidRuntimeProviderManifest | null | undefined;
}

export interface MermaidBundleReport {
  readonly providerManifest: MermaidRuntimeProviderManifest | null;
  readonly jsAssets: MermaidBundleAsset[];
  readonly mermaidAssets: MermaidBundleAsset[];
  readonly largestAsyncAsset: MermaidBundleAsset | null;
  readonly dominantMermaidAsset: MermaidBundleAsset | null;
  readonly totalMermaidBytes: number;
}

export function buildMermaidBundleReport(input: BuildMermaidBundleReportInput): MermaidBundleReport;
