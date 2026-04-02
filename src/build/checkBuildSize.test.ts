import { describe, expect, it } from 'vitest';

import { BUILD_SIZE_BUDGETS } from '../../scripts/rspack/build-size-budgets.mjs';
import {
  evaluateBuildSizeBudgets,
  extractInitialAssets,
} from '../../scripts/build/index.mjs';

describe('BUILD_SIZE_BUDGETS', () => {
  it('exports the shared frontend asset thresholds', () => {
    expect(BUILD_SIZE_BUDGETS).toEqual({
      maxAssetSize: 2_400_000,
      maxEntrypointSize: 3_800_000,
    });
  });
});

describe('build-size CLI normalization', () => {
  it('keeps the stable CLI entrypoint and extracted implementation barrel', async () => {
    const cli = await import('../../scripts/check-build-size.mjs');
    const implementation = await import('../../scripts/build/index.mjs');

    expect(cli.runBuildSizeCheck).toBe(implementation.runBuildSizeCheck);
    expect(cli.evaluateBuildSizeBudgets).toBe(implementation.evaluateBuildSizeBudgets);
    expect(cli.extractInitialAssets).toBe(implementation.extractInitialAssets);
  });
});

describe('extractInitialAssets', () => {
  it('collects initial js and css assets from index html', () => {
    const indexHtml = `
      <html>
        <head>
          <link rel="stylesheet" href="./vendors.css?v=1" />
          <link href="./main.css#entry" rel="stylesheet" />
          <link rel="preload" href="./ignored.css" as="style" />
        </head>
        <body>
          <script src="./vendors.js"></script>
          <script src="/main.js?cache=1"></script>
          <script src="https://example.com/remote.js"></script>
          <script src="./vendors.js"></script>
        </body>
      </html>
    `;

    expect(extractInitialAssets(indexHtml)).toEqual([
      'vendors.js',
      'main.js',
      'vendors.css',
      'main.css',
    ]);
  });
});

describe('evaluateBuildSizeBudgets', () => {
  it('passes when assets and entrypoint stay within budget', () => {
    const report = evaluateBuildSizeBudgets({
      indexHtml: `
        <link rel="stylesheet" href="./main.css" />
        <script src="./main.js"></script>
      `,
      fileSizes: {
        'main.css': 25_000,
        'main.js': 300_000,
      },
      maxAssetSize: 400_000,
      maxEntrypointSize: 400_000,
    });

    expect(report.passed).toBe(true);
    expect(report.oversizedAssets).toEqual([]);
    expect(report.missingAssets).toEqual([]);
    expect(report.entrypointSize).toBe(325_000);
  });

  it('flags oversized assets and oversized entrypoint totals', () => {
    const report = evaluateBuildSizeBudgets({
      indexHtml: `
        <link rel="stylesheet" href="./main.css" />
        <script src="./vendors.js"></script>
        <script src="./main.js"></script>
      `,
      fileSizes: {
        'main.css': 150_000,
        'vendors.js': 500_000,
        'main.js': 450_000,
      },
      maxAssetSize: 475_000,
      maxEntrypointSize: 900_000,
    });

    expect(report.passed).toBe(false);
    expect(report.oversizedAssets).toEqual([{ asset: 'vendors.js', size: 500_000 }]);
    expect(report.entrypointSize).toBe(1_100_000);
  });

  it('flags missing emitted assets referenced by the entry html', () => {
    const report = evaluateBuildSizeBudgets({
      indexHtml: `
        <link rel="stylesheet" href="./main.css" />
        <script src="./main.js"></script>
      `,
      fileSizes: {
        'main.css': 25_000,
      },
      maxAssetSize: 400_000,
      maxEntrypointSize: 400_000,
    });

    expect(report.passed).toBe(false);
    expect(report.missingAssets).toEqual(['main.js']);
  });
});
