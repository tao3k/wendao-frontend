import React, { useEffect, useMemo, useState } from "react";
import "./CodeSyntaxHighlighter.css";
import {
  isSupportedCodeLanguage,
  loadCodeTokens,
  normalizeCodeTheme,
  type ShikiTokensResult,
  type SupportedCodeLanguage,
} from "./shikiHighlighter";

export interface CodeSyntaxHighlighterProps {
  source: string;
  language?: string | null;
  sourcePath?: string | null;
  className?: string;
  theme?: string;
}

type ShikiToken = ShikiTokensResult["tokens"][number][number];

const CODE_LANGUAGE_ALIASES: Record<string, string> = {
  cjs: "javascript",
  js: "javascript",
  jsx: "jsx",
  javascriptreact: "jsx",
  jl: "julia",
  mjs: "javascript",
  plain: "plaintext",
  plaintext: "plaintext",
  py: "python",
  python3: "python",
  rs: "rust",
  text: "plaintext",
  ts: "typescript",
  tsx: "tsx",
  typescriptreact: "tsx",
};

function normalizeLanguage(language?: string | null): string | null {
  if (!language) {
    return null;
  }

  const normalized = language.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized === "none" ||
    normalized === "plaintext" ||
    normalized === "text" ||
    normalized === "plain" ||
    normalized === "code"
  ) {
    return null;
  }

  return CODE_LANGUAGE_ALIASES[normalized] ?? normalized;
}

export function inferCodeLanguageFromPath(path?: string | null): string | null {
  if (!path) {
    return null;
  }

  const extension = path.split(".").pop()?.toLowerCase();
  const languageByExtension: Record<string, string | null> = {
    bash: "bash",
    cjs: "javascript",
    css: "css",
    go: "go",
    html: "html",
    ini: "ini",
    jl: "julia",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    markdown: "markdown",
    md: "markdown",
    mjs: "javascript",
    py: "python",
    rs: "rust",
    scss: "scss",
    sh: "bash",
    sql: "sql",
    toml: "toml",
    ts: "typescript",
    tsx: "tsx",
    txt: null,
    yaml: "yaml",
    yml: "yaml",
    zsh: "bash",
  };

  return normalizeLanguage(languageByExtension[extension || ""]);
}

function resolveTokenFontStyle(fontStyle?: unknown): React.CSSProperties {
  if (fontStyle === null || fontStyle === undefined) {
    return {};
  }

  const normalized = String(fontStyle).toLowerCase();
  return {
    fontStyle: normalized.includes("italic") ? "italic" : undefined,
    fontWeight: normalized.includes("bold") ? 700 : undefined,
    textDecoration: normalized.includes("underline") ? "underline" : undefined,
  };
}

function renderTokenKey(lineIndex: number, tokenIndex: number, token: ShikiToken): string {
  return `${lineIndex}:${tokenIndex}:${token.offset ?? 0}:${token.content}`;
}

function buildCodeSyntaxThemeStyle(tokens: ShikiTokensResult): React.CSSProperties {
  return {
    "--code-syntax-foreground": tokens.fg,
    "--code-syntax-background": tokens.bg,
  } as React.CSSProperties;
}

function buildCodeSyntaxTokenStyle(token: ShikiToken): React.CSSProperties {
  return {
    color: token.color,
    ...resolveTokenFontStyle(token.fontStyle),
  };
}

const tokenCache = new Map<string, Promise<ShikiTokensResult>>();
const MAX_TOKEN_CACHE_ENTRIES = 200;

async function loadTokens(
  source: string,
  language: string,
  theme: string,
): Promise<ShikiTokensResult> {
  const normalizedTheme = normalizeCodeTheme(theme);
  const cacheKey = `${normalizedTheme}::${language}::${source}`;
  const cached = tokenCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = loadCodeTokens(source, language as SupportedCodeLanguage, normalizedTheme);

  tokenCache.set(cacheKey, promise);
  if (tokenCache.size > MAX_TOKEN_CACHE_ENTRIES) {
    const oldestKey = tokenCache.keys().next().value as string | undefined;
    if (oldestKey) {
      tokenCache.delete(oldestKey);
    }
  }

  return promise.catch((error) => {
    tokenCache.delete(cacheKey);
    throw error;
  });
}

export function normalizeCodeLanguage(language?: string | null): string | null {
  return normalizeLanguage(language);
}

export const CodeSyntaxHighlighter: React.FC<CodeSyntaxHighlighterProps> = ({
  source,
  language,
  sourcePath,
  className,
  theme = "tokyo-night",
}) => {
  const normalizedLanguage = useMemo(() => normalizeLanguage(language), [language]);
  const inferredLanguage = useMemo(() => inferCodeLanguageFromPath(sourcePath), [sourcePath]);
  const effectiveLanguage = useMemo(() => {
    const candidate = normalizedLanguage ?? inferredLanguage;
    if (!candidate || !isSupportedCodeLanguage(candidate)) {
      return null;
    }

    return candidate;
  }, [inferredLanguage, normalizedLanguage]);
  const [tokens, setTokens] = useState<ShikiTokensResult | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    let cancelled = false;

    if (!effectiveLanguage) {
      setTokens(null);
      setLoadState("idle");
      return () => {
        cancelled = true;
      };
    }

    setTokens(null);
    setLoadState("loading");

    void loadTokens(source, effectiveLanguage, theme)
      .then((result) => {
        if (cancelled) {
          return undefined;
        }

        setTokens(result);
        setLoadState("ready");
        return undefined;
      })
      .catch(() => {
        if (cancelled) {
          return undefined;
        }

        setTokens(null);
        setLoadState("error");
        return undefined;
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveLanguage, source, theme]);

  const wrapperClassName = [
    "code-syntax-highlighter",
    loadState === "idle" || loadState === "error"
      ? "code-syntax-highlighter--plain"
      : "code-syntax-highlighter--shiki",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  if (!effectiveLanguage || !tokens) {
    return (
      <span className={wrapperClassName} data-language={effectiveLanguage ?? undefined}>
        {source}
      </span>
    );
  }

  const themeStyle = buildCodeSyntaxThemeStyle(tokens);

  return (
    <span
      className={wrapperClassName}
      data-language={effectiveLanguage}
      data-theme={tokens.themeName ?? theme}
      style={themeStyle}
    >
      {tokens.tokens.map((line, lineIndex) => (
        <React.Fragment key={`${lineIndex}-${line.length}`}>
          {line.length > 0 ? (
            line.map((token, tokenIndex) => (
              <span
                key={renderTokenKey(lineIndex, tokenIndex, token)}
                className="code-syntax-highlighter__token"
                style={buildCodeSyntaxTokenStyle(token)}
              >
                {token.content}
              </span>
            ))
          ) : (
            <span className="code-syntax-highlighter__token">{"\u00A0"}</span>
          )}
          {lineIndex < tokens.tokens.length - 1 ? "\n" : null}
        </React.Fragment>
      ))}
    </span>
  );
};
