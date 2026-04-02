import path from 'node:path';
import { fileURLToPath } from 'node:url';
export {
  DEFAULT_MAX_ASSET_SIZE,
  DEFAULT_MAX_ENTRYPOINT_SIZE,
  evaluateBuildSizeBudgets,
  extractInitialAssets,
  runBuildSizeCheck,
} from './build/index.mjs';
import { runBuildSizeCheck } from './build/index.mjs';

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);

if (invokedPath === currentPath) {
  runBuildSizeCheck().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
