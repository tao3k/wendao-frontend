import { describe, expect, it } from 'vitest';

describe('mermaid-bundle-report CLI normalization', () => {
  it('keeps the stable CLI entrypoint and extracted implementation barrel', async () => {
    const cli = await import('../../scripts/mermaid-bundle-report.mjs');
    const implementation = await import('../../scripts/build/index.mjs');

    expect(cli.buildMermaidBundleReport).toBe(implementation.buildMermaidBundleReport);
    expect(cli.runMermaidBundleReport).toBe(implementation.runMermaidBundleReport);
  });
});
