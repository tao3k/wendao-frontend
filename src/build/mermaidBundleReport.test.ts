import { describe, expect, it } from 'vitest';

import { buildMermaidBundleReport } from '../../scripts/build/index.mjs';

describe('buildMermaidBundleReport', () => {
  it('summarizes mermaid-related assets separately from the general JS frontier', () => {
    const report = buildMermaidBundleReport({
      providerManifest: {
        providerName: 'beautiful-mermaid',
        packageName: 'beautiful-mermaid',
        supportedInlineDialects: ['flowchart', 'graph', 'state', 'unknown'],
        payloadNotes: ['ELK-backed flowchart/state layout'],
      },
      fileSizes: {
        'vendors.js': 200_000,
        'mermaid.js': 1_672_216,
        'shiki-core.js': 705_648,
        'vendors-async-mermaid-helper.js': 80_000,
        'main.css': 12_000,
      },
    });

    expect(report.largestAsyncAsset).toEqual({
      asset: 'mermaid.js',
      size: 1_672_216,
    });
    expect(report.dominantMermaidAsset).toEqual({
      asset: 'mermaid.js',
      size: 1_672_216,
    });
    expect(report.totalMermaidBytes).toBe(1_752_216);
    expect(report.mermaidAssets.map(({ asset }) => asset)).toEqual([
      'mermaid.js',
      'vendors-async-mermaid-helper.js',
    ]);
    expect(report.providerManifest?.providerName).toBe('beautiful-mermaid');
  });
});
