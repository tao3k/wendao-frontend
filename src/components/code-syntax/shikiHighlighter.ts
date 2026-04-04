import {
  createBundledHighlighter,
  createSingletonShorthands,
  type TokensResult,
} from "@shikijs/core";
import { createOnigurumaEngine } from "@shikijs/engine-oniguruma";
import onigurumaWasm from "@shikijs/engine-oniguruma/wasm-inlined";

const SUPPORTED_CODE_LANGUAGES = {
  bash: () => import(/* webpackChunkName: "shiki-lang-bash" */ "@shikijs/langs/bash"),
  css: () => import(/* webpackChunkName: "shiki-lang-css" */ "@shikijs/langs/css"),
  go: () => import(/* webpackChunkName: "shiki-lang-go" */ "@shikijs/langs/go"),
  html: () => import(/* webpackChunkName: "shiki-lang-html" */ "@shikijs/langs/html"),
  ini: () => import(/* webpackChunkName: "shiki-lang-ini" */ "@shikijs/langs/ini"),
  javascript: () =>
    import(/* webpackChunkName: "shiki-lang-javascript" */ "@shikijs/langs/javascript"),
  json: () => import(/* webpackChunkName: "shiki-lang-json" */ "@shikijs/langs/json"),
  jsx: () => import(/* webpackChunkName: "shiki-lang-jsx" */ "@shikijs/langs/jsx"),
  julia: () => import(/* webpackChunkName: "shiki-lang-julia" */ "@shikijs/langs/jl"),
  markdown: () => import(/* webpackChunkName: "shiki-lang-markdown" */ "@shikijs/langs/markdown"),
  python: () => import(/* webpackChunkName: "shiki-lang-python" */ "@shikijs/langs/python"),
  rust: () => import(/* webpackChunkName: "shiki-lang-rust" */ "@shikijs/langs/rust"),
  scss: () => import(/* webpackChunkName: "shiki-lang-scss" */ "@shikijs/langs/scss"),
  sql: () => import(/* webpackChunkName: "shiki-lang-sql" */ "@shikijs/langs/sql"),
  toml: () => import(/* webpackChunkName: "shiki-lang-toml" */ "@shikijs/langs/toml"),
  tsx: () => import(/* webpackChunkName: "shiki-lang-tsx" */ "@shikijs/langs/tsx"),
  typescript: () =>
    import(/* webpackChunkName: "shiki-lang-typescript" */ "@shikijs/langs/typescript"),
  yaml: () => import(/* webpackChunkName: "shiki-lang-yaml" */ "@shikijs/langs/yaml"),
} as const;

const SUPPORTED_CODE_THEMES = {
  "tokyo-night": () =>
    import(/* webpackChunkName: "shiki-theme-tokyo-night" */ "@shikijs/themes/tokyo-night"),
} as const;

const DEFAULT_CODE_THEME = "tokyo-night";

const shiki = createSingletonShorthands(
  createBundledHighlighter({
    langs: SUPPORTED_CODE_LANGUAGES,
    themes: SUPPORTED_CODE_THEMES,
    engine: () => createOnigurumaEngine(onigurumaWasm),
  }),
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
  theme: SupportedCodeTheme,
): Promise<ShikiTokensResult> {
  return shiki.codeToTokens(source, {
    lang: language,
    theme,
  });
}
