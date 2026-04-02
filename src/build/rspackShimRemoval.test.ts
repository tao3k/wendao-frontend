import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const fromHere = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url));

describe('rspack shim removal', () => {
  it('keeps the normalized helper tree present', () => {
    expect(existsSync(fromHere('../../scripts/rspack/index.ts'))).toBe(true);
    expect(
      existsSync(fromHere('../../scripts/rspack/build-size-budgets.mjs')),
    ).toBe(true);
    expect(existsSync(fromHere('../../scripts/rspack/chunk-policy.mjs'))).toBe(
      true,
    );
  });

  it('removes the retired root-level shim files', () => {
    expect(existsSync(fromHere('../../scripts/build-size-budgets.mjs'))).toBe(
      false,
    );
    expect(existsSync(fromHere('../../scripts/rspack-chunk-policy.mjs'))).toBe(
      false,
    );
    expect(
      existsSync(fromHere('../../scripts/rspack-build-environment.ts')),
    ).toBe(false);
    expect(existsSync(fromHere('../../scripts/rspack-build-profile.ts'))).toBe(
      false,
    );
    expect(existsSync(fromHere('../../scripts/rspack-module-rules.ts'))).toBe(
      false,
    );
    expect(existsSync(fromHere('../../scripts/rspack-core-surface.ts'))).toBe(
      false,
    );
  });
});
