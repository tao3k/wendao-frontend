import type { Configuration } from '@rspack/core';

export function createRspackEntry(): NonNullable<Configuration['entry']> {
  return {
    main: './src/main.tsx',
  };
}

export function createRspackOutput(): NonNullable<Configuration['output']> {
  return {
    clean: true,
  };
}

export function createRspackResolve(): NonNullable<Configuration['resolve']> {
  return {
    extensions: ['...', '.ts', '.tsx', '.jsx'],
    alias: {
      '@': './src',
    },
  };
}
