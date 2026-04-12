import type { BuildSizeBudgetReport } from "./check-build-size-model.mjs";

export interface RunBuildSizeCheckOptions {
  readonly distDir?: string | undefined;
  readonly maxAssetSize?: number | undefined;
  readonly maxEntrypointSize?: number | undefined;
}

export function runBuildSizeCheck(
  options?: RunBuildSizeCheckOptions,
): Promise<BuildSizeBudgetReport>;
