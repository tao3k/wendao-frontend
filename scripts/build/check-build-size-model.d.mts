export interface OversizedAsset {
  readonly asset: string;
  readonly size: number;
}

export interface BuildSizeBudgetReport {
  readonly initialAssets: string[];
  readonly missingAssets: string[];
  readonly oversizedAssets: OversizedAsset[];
  readonly entrypointSize: number;
  readonly maxAssetSize: number;
  readonly maxEntrypointSize: number;
  readonly passed: boolean;
}

export interface EvaluateBuildSizeBudgetsInput {
  readonly indexHtml: string;
  readonly fileSizes: Record<string, number>;
  readonly maxAssetSize?: number | undefined;
  readonly maxEntrypointSize?: number | undefined;
}

export const DEFAULT_MAX_ASSET_SIZE: number;
export const DEFAULT_MAX_ENTRYPOINT_SIZE: number;

export function extractInitialAssets(indexHtml: string): string[];
export function evaluateBuildSizeBudgets(
  input: EvaluateBuildSizeBudgetsInput,
): BuildSizeBudgetReport;
