import { createBundledHighlighter, createSingletonShorthands, type TokensResult } from '@shikijs/core';
import { createOnigurumaEngine } from '@shikijs/engine-oniguruma';
import onigurumaWasm from '@shikijs/engine-oniguruma/wasm-inlined';

const SUPPORTED_CODE_LANGUAGES = {
  bash: () => import('@shikijs/langs/bash'),
  css: () => import('@shikijs/langs/css'),
  go: () => import('@shikijs/langs/go'),
  html: () => import('@shikijs/langs/html'),
  ini: () => import('@shikijs/langs/ini'),
  javascript: () => import('@shikijs/langs/javascript'),
  json: () => import('@shikijs/langs/json'),
  jsx: () => import('@shikijs/langs/jsx'),
  julia: () => import('@shikijs/langs/jl'),
  markdown: () => import('@shikijs/langs/markdown'),
  python: () => import('@shikijs/langs/python'),
  rust: () => import('@shikijs/langs/rust'),
  scss: () => import('@shikijs/langs/scss'),
  sql: () => import('@shikijs/langs/sql'),
  toml: () => import('@shikijs/langs/toml'),
  tsx: () => import('@shikijs/langs/tsx'),
  typescript: () => import('@shikijs/langs/typescript'),
  yaml: () => import('@shikijs/langs/yaml'),
} as const;

const SUPPORTED_CODE_THEMES = {
  'tokyo-night': () => import('@shikijs/themes/tokyo-night'),
} as const;

const DEFAULT_CODE_THEME = 'tokyo-night';

const shiki = createSingletonShorthands(
  createBundledHighlighter({
    langs: SUPPORTED_CODE_LANGUAGES,
    themes: SUPPORTED_CODE_THEMES,
    engine: () => createOnigurumaEngine(onigurumaWasm),
  })
);

export type SupportedCodeLanguage = keyof typeof SUPPORTED_CODE_LANGUAGES;
export type SupportedCodeTheme = keyof typeof SUPPORTED_CODE_THEMES;
export type ShikiTokensResult = TokensResult;

export function isSupportedCodeLanguage(language: string): language is SupportedCodeLanguage {
  return Object.hasOwn(SUPPORTED_CODE_LANGUAGES, language);
}

export function normalizeCodeTheme(theme?: string | null): SupportedCodeTheme {
  return theme === DEFAULT_CODE_THEME ? theme : DEFAULT_CODE_THEME;
}

export async function loadCodeTokens(
  source: string,
  language: SupportedCodeLanguage,
  theme: SupportedCodeTheme
): Promise<ShikiTokensResult> {
  return shiki.codeToTokens(source, {
    lang: language,
    theme,
  });
}
