import path from 'node:path';
import { fileURLToPath } from 'node:url';
export {
  buildMermaidBundleReport,
  runMermaidBundleReport,
} from './build/index.mjs';
import { runMermaidBundleReport } from './build/index.mjs';

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);

function readProviderNameFromArgs(argv) {
  const providerFlagIndex = argv.indexOf('--provider');
  if (providerFlagIndex === -1) {
    return undefined;
  }

  return argv[providerFlagIndex + 1];
}

if (invokedPath === currentPath) {
  runMermaidBundleReport({
    providerName: readProviderNameFromArgs(process.argv.slice(2)),
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
