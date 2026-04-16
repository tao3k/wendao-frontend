import type { AutocompleteSuggestion } from "../../api";
import type { SearchResult } from "./types";
import { isCodeSearchResult } from "./searchResultNormalization";

export interface SearchFilters {
  language: string[];
  kind: string[];
  repo: string[];
  path: string[];
}

export interface ParsedCodeFilters {
  baseQuery: string;
  filters: SearchFilters;
}

export interface CodeRepoFacetEntry {
  id: string;
  repoId: string;
  count: number;
  token: string;
  label: string;
}

interface BuildCodeFilterSuggestionsOptions {
  includeDefaultPrefixes?: boolean;
}

export const STRUCTURAL_CODE_PREFIXES = ["ast", "sg"] as const;
export const CODE_FILTER_PREFIXES = [
  "lang",
  "kind",
  "repo",
  "path",
  ...STRUCTURAL_CODE_PREFIXES,
] as const;
export type CodeFilterPrefix = (typeof CODE_FILTER_PREFIXES)[number];
export const AST_STRUCTURAL_LANGUAGES = [
  "python",
  "rust",
  "javascript",
  "typescript",
  "bash",
  "go",
  "java",
  "c",
  "cpp",
  "csharp",
  "ruby",
  "swift",
  "kotlin",
  "lua",
  "php",
  "json",
  "yaml",
  "toml",
  "markdown",
  "dockerfile",
  "html",
  "css",
  "sql",
] as const;

type StructuralCodePrefix = (typeof STRUCTURAL_CODE_PREFIXES)[number];
type StructuralTemplateSpec = {
  prefix: StructuralCodePrefix;
  pattern: string;
};

const AST_STRUCTURAL_LANGUAGE_SET = new Set<string>(AST_STRUCTURAL_LANGUAGES);
const STRUCTURAL_LANGUAGE_EXTENSION_MAP: Array<[suffix: string, language: string]> = [
  [".py", "python"],
  [".rs", "rust"],
  [".js", "javascript"],
  [".mjs", "javascript"],
  [".ts", "typescript"],
  [".tsx", "typescript"],
  [".sh", "bash"],
  [".bash", "bash"],
  [".go", "go"],
  [".java", "java"],
  [".c", "c"],
  [".h", "c"],
  [".cpp", "cpp"],
  [".cc", "cpp"],
  [".cxx", "cpp"],
  [".hpp", "cpp"],
  [".cs", "csharp"],
  [".rb", "ruby"],
  [".swift", "swift"],
  [".kt", "kotlin"],
  [".kts", "kotlin"],
  [".lua", "lua"],
  [".php", "php"],
  [".json", "json"],
  [".yaml", "yaml"],
  [".yml", "yaml"],
  [".toml", "toml"],
  [".md", "markdown"],
  [".html", "html"],
  [".htm", "html"],
  [".css", "css"],
  [".sql", "sql"],
];

const STRUCTURAL_TEMPLATE_LIBRARY: Record<string, StructuralTemplateSpec[]> = {
  rust: [
    { prefix: "ast", pattern: "fn $NAME($$$ARGS) { $$$BODY }" },
    { prefix: "sg", pattern: "impl $T { $$$BODY }" },
    { prefix: "ast", pattern: "struct $NAME { $$$FIELDS }" },
  ],
  python: [
    { prefix: "ast", pattern: "def $NAME($$$ARGS): $$$BODY" },
    { prefix: "sg", pattern: "class $NAME($$$BASES): $$$BODY" },
  ],
  typescript: [
    { prefix: "ast", pattern: "function $NAME($$$ARGS) { $$$BODY }" },
    { prefix: "sg", pattern: "class $NAME { $$$BODY }" },
    { prefix: "ast", pattern: "export function $NAME($$$ARGS) { $$$BODY }" },
  ],
  javascript: [
    { prefix: "ast", pattern: "function $NAME($$$ARGS) { $$$BODY }" },
    { prefix: "sg", pattern: "class $NAME { $$$BODY }" },
    { prefix: "ast", pattern: "export function $NAME($$$ARGS) { $$$BODY }" },
  ],
  go: [
    { prefix: "ast", pattern: "func $NAME($$$ARGS) { $$$BODY }" },
    { prefix: "sg", pattern: "type $NAME interface { $$$BODY }" },
  ],
  html: [
    { prefix: "ast", pattern: "<$TAG $$$ATTRS>$$$BODY</$TAG>" },
    { prefix: "sg", pattern: "<$TAG $$$ATTRS />" },
  ],
  css: [
    { prefix: "ast", pattern: "$SELECTOR { $$$BODY }" },
    { prefix: "sg", pattern: "@media $COND { $$$BODY }" },
  ],
  sql: [
    { prefix: "ast", pattern: "SELECT $$$COLUMNS FROM $TABLE" },
    { prefix: "sg", pattern: "CREATE TABLE $NAME ($$$BODY)" },
  ],
  toml: [
    { prefix: "ast", pattern: "[$SECTION]" },
    { prefix: "sg", pattern: "$KEY = $VALUE" },
  ],
  generic: [
    { prefix: "ast", pattern: "$PATTERN" },
    { prefix: "sg", pattern: "$PATTERN" },
  ],
};

const CODE_FILTER_PREFIX_BY_KEY: Record<keyof SearchFilters, string> = {
  language: "lang",
  kind: "kind",
  repo: "repo",
  path: "path",
};

const CODE_FILTER_DEFAULT_VALUES: Record<keyof SearchFilters, string[]> = {
  language: [],
  kind: [],
  repo: [],
  path: [],
};

function mapFilterPrefixToKey(prefix: string): keyof SearchFilters | null {
  const normalized = prefix.toLowerCase();
  if (normalized === "lang" || normalized === "language") {
    return "language";
  }
  if (normalized === "kind") {
    return "kind";
  }
  if (normalized === "repo") {
    return "repo";
  }
  if (normalized === "path") {
    return "path";
  }
  return null;
}

function replaceLastQueryToken(query: string, nextToken: string): string {
  const trimmedEnd = query.replace(/\s+$/, "");
  if (!trimmedEnd) {
    return nextToken;
  }
  const lastSpaceIndex = trimmedEnd.lastIndexOf(" ");
  if (lastSpaceIndex < 0) {
    return nextToken;
  }
  return `${trimmedEnd.slice(0, lastSpaceIndex + 1)}${nextToken}`.trim();
}

function uniqueSuggestionValues(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    output.push(normalized);
  });

  return output;
}

function rankFilterSuggestionValues(values: string[], typedValue: string): string[] {
  if (!typedValue) {
    return values;
  }

  const exactMatches: string[] = [];
  const prefixMatches: string[] = [];
  const substringMatches: string[] = [];

  values.forEach((value) => {
    if (value === typedValue) {
      exactMatches.push(value);
      return;
    }
    if (value.startsWith(typedValue)) {
      prefixMatches.push(value);
      return;
    }
    if (value.includes(typedValue)) {
      substringMatches.push(value);
    }
  });

  return [...exactMatches, ...prefixMatches, ...substringMatches];
}

function normalizeStructuralLanguage(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && AST_STRUCTURAL_LANGUAGE_SET.has(normalized) ? normalized : null;
}

function inferStructuralLanguageFromPath(pathFilter: string): string | null {
  const normalizedPath = pathFilter.trim().toLowerCase();
  if (!normalizedPath) {
    return null;
  }
  if (
    normalizedPath === "dockerfile" ||
    normalizedPath.endsWith("/dockerfile") ||
    normalizedPath.endsWith("\\dockerfile")
  ) {
    return "dockerfile";
  }

  for (const [suffix, language] of STRUCTURAL_LANGUAGE_EXTENSION_MAP) {
    if (normalizedPath.endsWith(suffix)) {
      return language;
    }
  }

  return null;
}

function structuralTemplateToken(prefix: StructuralCodePrefix, pattern: string): string {
  return `${prefix}:"${pattern}"`;
}

function resolveStructuralTemplateSpecs(language: string): StructuralTemplateSpec[] {
  return STRUCTURAL_TEMPLATE_LIBRARY[language] ?? STRUCTURAL_TEMPLATE_LIBRARY.generic;
}

function resolveStructuralTemplateLanguage(
  activeFilters: SearchFilters,
  catalog?: SearchFilters,
): string {
  return resolvePreferredStructuralLanguage(activeFilters, catalog) ?? "generic";
}

function resolvePreferredStructuralLanguage(
  activeFilters: SearchFilters,
  catalog?: SearchFilters,
): string | null {
  for (const language of activeFilters.language) {
    const normalized = normalizeStructuralLanguage(language);
    if (normalized) {
      return normalized;
    }
  }

  for (const pathFilter of activeFilters.path) {
    const inferred = inferStructuralLanguageFromPath(pathFilter);
    if (inferred) {
      return inferred;
    }
  }

  for (const language of catalog?.language ?? []) {
    const normalized = normalizeStructuralLanguage(language);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function filterStructuralTemplateSpecs(
  templates: StructuralTemplateSpec[],
  prefix: StructuralCodePrefix,
  typedValue: string,
): StructuralTemplateSpec[] {
  const normalizedTypedValue = typedValue.replace(/^['"]/, "").toLowerCase();
  return templates
    .filter((template) => template.prefix === prefix)
    .filter((template) =>
      normalizedTypedValue.length === 0
        ? true
        : template.pattern.toLowerCase().includes(normalizedTypedValue),
    );
}

function formatStructuralLanguageLabel(language: string): string {
  switch (language) {
    case "javascript":
      return "JavaScript";
    case "typescript":
      return "TypeScript";
    case "csharp":
      return "C#";
    case "cpp":
      return "C++";
    case "toml":
      return "TOML";
    case "yaml":
      return "YAML";
    case "json":
      return "JSON";
    case "sql":
      return "SQL";
    case "html":
      return "HTML";
    case "css":
      return "CSS";
    default:
      return language.charAt(0).toUpperCase() + language.slice(1);
  }
}

export function inferStructuralSearchLanguage(filters: SearchFilters): string | null {
  return resolvePreferredStructuralLanguage(filters, undefined);
}

export function buildStructuralSearchGuidance(language: string): string {
  const [astTemplate] = filterStructuralTemplateSpecs(
    resolveStructuralTemplateSpecs(language),
    "ast",
    "",
  );
  const [sgTemplate] = filterStructuralTemplateSpecs(
    resolveStructuralTemplateSpecs(language),
    "sg",
    "",
  );
  const astToken = structuralTemplateToken(
    astTemplate?.prefix ?? "ast",
    astTemplate?.pattern ?? "$PATTERN",
  );
  const sgToken = structuralTemplateToken(
    sgTemplate?.prefix ?? "sg",
    sgTemplate?.pattern ?? "$PATTERN",
  );
  if (language === "generic") {
    return `Try structural code search with ${astToken} or ${sgToken}`;
  }
  return `Try structural ${formatStructuralLanguageLabel(language)} search with ${astToken} or ${sgToken}`;
}

export function parseCodeFilters(query: string): ParsedCodeFilters {
  const normalized = query.trim();
  if (!normalized) {
    return { baseQuery: "", filters: { language: [], kind: [], repo: [], path: [] } };
  }

  const tokens = normalized.split(/\s+/);
  const baseTokens: string[] = [];
  const seenBaseTokens = new Set<string>();
  const filters: SearchFilters = {
    language: [],
    kind: [],
    repo: [],
    path: [],
  };

  tokens.forEach((token) => {
    const lower = token.toLowerCase();
    if (lower.startsWith("lang:")) {
      const language = token.slice(5).trim();
      if (language) {
        filters.language.push(language.toLowerCase());
      }
      return;
    }
    if (lower.startsWith("language:")) {
      const language = token.slice(9).trim();
      if (language) {
        filters.language.push(language.toLowerCase());
      }
      return;
    }
    if (lower.startsWith("kind:")) {
      const kind = token.slice(5).trim();
      if (kind) {
        filters.kind.push(kind.toLowerCase());
      }
      return;
    }
    if (lower.startsWith("repo:")) {
      const repo = token.slice(5).trim();
      if (repo) {
        filters.repo.push(repo.toLowerCase());
      }
      return;
    }
    if (lower.startsWith("path:")) {
      const path = token.slice(5).trim();
      if (path) {
        filters.path.push(path.toLowerCase());
      }
      return;
    }
    if (!seenBaseTokens.has(lower)) {
      seenBaseTokens.add(lower);
      baseTokens.push(token);
    }
  });

  return { baseQuery: baseTokens.join(" ").trim(), filters };
}

export function normalizeCodeSearchQuery(query: string): string {
  const normalized = query.trim();
  if (!normalized) {
    return "";
  }

  const tokens = normalized.split(/\s+/);
  const dedupedTokens: string[] = [];
  const seenBaseTokens = new Set<string>();

  tokens.forEach((token) => {
    if (token.includes(":")) {
      dedupedTokens.push(token);
      return;
    }

    const lower = token.toLowerCase();
    if (seenBaseTokens.has(lower)) {
      return;
    }
    seenBaseTokens.add(lower);
    dedupedTokens.push(token);
  });

  return dedupedTokens.join(" ").trim();
}

export function stripCodeFilters(query: string): string {
  return parseCodeFilters(query).baseQuery;
}

export function hasStructuralCodeQuery(query: string): boolean {
  return /(?:^|\s)(?:ast|sg):/i.test(query);
}

export function removeCodeFilterFromQuery(
  query: string,
  filterKind: keyof SearchFilters,
  filterValue: string,
): string {
  const aliases: Record<keyof SearchFilters, string[]> = {
    language: ["lang", "language"],
    kind: ["kind"],
    repo: ["repo"],
    path: ["path"],
  };
  const target = filterValue.toLowerCase();
  const prefixes = aliases[filterKind];
  return query
    .split(/\s+/)
    .filter((token) => {
      const lower = token.toLowerCase();
      const matched = prefixes.some((prefix) => lower.startsWith(`${prefix}:`));
      if (!matched) {
        return true;
      }
      const value = token.substring(token.indexOf(":") + 1).toLowerCase();
      return value !== target;
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function buildCodeFilterSuggestions(
  rawQuery: string,
  activeFilters: SearchFilters,
  catalog: SearchFilters,
  options: BuildCodeFilterSuggestionsOptions = {},
): AutocompleteSuggestion[] {
  const { includeDefaultPrefixes = true } = options;
  const query = rawQuery.trim();
  if (!query) {
    return [];
  }

  const explicitFilterToken = /(?:^|\s)(lang|language|kind|repo|path|ast|sg):([^\s]*)$/i.exec(
    query,
  );
  if (explicitFilterToken) {
    const explicitPrefix = explicitFilterToken[1].toLowerCase();
    if (explicitPrefix === "ast" || explicitPrefix === "sg") {
      const preferredLanguage = resolveStructuralTemplateLanguage(activeFilters, catalog);
      return filterStructuralTemplateSpecs(
        resolveStructuralTemplateSpecs(preferredLanguage),
        explicitPrefix,
        explicitFilterToken[2],
      )
        .slice(0, 4)
        .map((template) => ({
          text: replaceLastQueryToken(
            query,
            structuralTemplateToken(template.prefix, template.pattern),
          ),
          suggestionType: "stem",
          docType: "filter",
        }));
    }

    const filterKey = mapFilterPrefixToKey(explicitFilterToken[1]);
    if (!filterKey) {
      return [];
    }

    const typedValue = explicitFilterToken[2].toLowerCase();
    const prefix = CODE_FILTER_PREFIX_BY_KEY[filterKey];
    const activeSet = new Set(activeFilters[filterKey].map((value) => value.toLowerCase()));
    const candidatePool = uniqueSuggestionValues([
      ...catalog[filterKey],
      ...CODE_FILTER_DEFAULT_VALUES[filterKey],
    ]);
    const candidates = rankFilterSuggestionValues(candidatePool, typedValue)
      .filter((value) => !activeSet.has(value) || value === typedValue)
      .slice(0, 6);

    if (candidates.length === 0 && typedValue) {
      candidates.push(typedValue);
    }

    return candidates.map((value) => ({
      text: replaceLastQueryToken(query, `${prefix}:${value}`),
      suggestionType: "filter",
    }));
  }

  const tokens = query.split(/\s+/);
  const lastToken = (tokens[tokens.length - 1] || "").toLowerCase();
  const prefixMatches = CODE_FILTER_PREFIXES.filter((prefix) => prefix.startsWith(lastToken));
  if (lastToken && !lastToken.includes(":") && prefixMatches.length > 0 && lastToken.length <= 4) {
    return prefixMatches.map((prefix) => ({
      text: replaceLastQueryToken(query, `${prefix}:`),
      suggestionType: "filter",
    }));
  }

  if (!includeDefaultPrefixes) {
    return [];
  }

  return CODE_FILTER_PREFIXES.map((prefix) => ({
    text: `${query} ${prefix}:`.trim(),
    suggestionType: "filter",
  }));
}

export function isFilterSuggestion(suggestion: AutocompleteSuggestion): boolean {
  return suggestion.suggestionType === "filter";
}

export function buildActiveCodeFilterEntries(
  filters: SearchFilters,
): Array<{ key: keyof SearchFilters; label: string }> {
  const entries: Array<{ key: keyof SearchFilters; label: string }> = [];
  filters.language.forEach((value) => entries.push({ key: "language", label: `lang:${value}` }));
  filters.kind.forEach((value) => entries.push({ key: "kind", label: `kind:${value}` }));
  filters.repo.forEach((value) => entries.push({ key: "repo", label: `repo:${value}` }));
  filters.path.forEach((value) => entries.push({ key: "path", label: `path:${value}` }));
  return entries;
}

export function buildCodeQuickExampleTokens(catalog: SearchFilters): string[] {
  const preferredLanguage =
    catalog.language.find((value) => value === "julia") || catalog.language[0] || "julia";
  const languageToken = `lang:${preferredLanguage}`;
  const kindToken = `kind:${catalog.kind[0] || "function"}`;
  const repoToken = `repo:${catalog.repo[0] || "xiuxian-wendao"}`;
  const pathToken = `path:${catalog.path.find((value) => value.includes("/")) || catalog.path[0] || "src/"}`;
  const structuralLanguage = resolveStructuralTemplateLanguage(
    { language: [preferredLanguage], kind: [], repo: [], path: [] },
    catalog,
  );
  const structuralTokens = resolveStructuralTemplateSpecs(structuralLanguage)
    .slice(0, 2)
    .map((template) => structuralTemplateToken(template.prefix, template.pattern));
  return [languageToken, kindToken, repoToken, pathToken, ...structuralTokens];
}

export function buildCodeQuickScenarios(
  catalog: SearchFilters,
  locale: "en" | "zh",
): Array<{ id: string; label: string; tokens: string[] }> {
  const preferredLanguage =
    catalog.language.find((value) => value === "julia") || catalog.language[0] || "julia";
  const preferredRepo = catalog.repo[0];
  const preferredPath = catalog.path.find((value) => value.includes("/")) || catalog.path[0];

  const scenarios: Array<{ id: string; label: string; tokens: string[] }> = [
    {
      id: "repo-functions",
      label: locale === "zh" ? "仓库函数" : "Repo functions",
      tokens: [
        `lang:${preferredLanguage}`,
        "kind:function",
        ...(preferredRepo ? [`repo:${preferredRepo}`] : []),
      ],
    },
    {
      id: "definition-lookup",
      label: locale === "zh" ? "定义定位" : "Definition lookup",
      tokens: ["kind:function"],
    },
    {
      id: "reference-trace",
      label: locale === "zh" ? "引用追踪" : "Reference trace",
      tokens: ["kind:reference", ...(preferredPath ? [`path:${preferredPath}`] : [])],
    },
  ];

  if (preferredRepo) {
    scenarios.unshift({
      id: "repo-intelligence",
      label: locale === "zh" ? "仓库智能" : "Repo intelligence",
      tokens: [`repo:${preferredRepo}`, `lang:${preferredLanguage}`, "kind:function"],
    });
  }

  const structuralLanguage = resolveStructuralTemplateLanguage(
    { language: [preferredLanguage], kind: [], repo: [], path: [] },
    catalog,
  );
  const structuralTemplates = resolveStructuralTemplateSpecs(structuralLanguage);
  const astTemplate = structuralTemplates.find((template) => template.prefix === "ast");
  const sgTemplate = structuralTemplates.find((template) => template.prefix === "sg");
  const structuralLanguageTokens =
    structuralLanguage === "generic" ? [] : [`lang:${structuralLanguage}`];
  const structuralLabelPrefix =
    structuralLanguage === "generic" ? "" : `${formatStructuralLanguageLabel(structuralLanguage)} `;
  if (astTemplate) {
    scenarios.unshift({
      id: "structural-ast",
      label:
        locale === "zh"
          ? `${structuralLabelPrefix}AST 模板`.trim()
          : `${structuralLabelPrefix}AST template`.trim(),
      tokens: [
        ...structuralLanguageTokens,
        ...(preferredRepo ? [`repo:${preferredRepo}`] : []),
        structuralTemplateToken(astTemplate.prefix, astTemplate.pattern),
      ],
    });
  }
  if (sgTemplate) {
    scenarios.unshift({
      id: "structural-sg",
      label:
        locale === "zh"
          ? `${structuralLabelPrefix}sg 模板`.trim()
          : `${structuralLabelPrefix}sg template`.trim(),
      tokens: [
        ...structuralLanguageTokens,
        ...(preferredRepo ? [`repo:${preferredRepo}`] : []),
        structuralTemplateToken(sgTemplate.prefix, sgTemplate.pattern),
      ],
    });
  }

  return scenarios;
}

export function buildCodeRepoFacetEntries(
  results: readonly SearchResult[],
  limit: number,
): CodeRepoFacetEntry[] {
  if (limit <= 0) {
    return [];
  }

  const repoCounts = new Map<string, number>();

  results.forEach((result) => {
    if (!isCodeSearchResult(result)) {
      return;
    }

    const normalizedRepo = result.codeRepo?.trim().toLowerCase();
    if (!normalizedRepo) {
      return;
    }

    repoCounts.set(normalizedRepo, (repoCounts.get(normalizedRepo) ?? 0) + 1);
  });

  return Array.from(repoCounts.entries())
    .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([repoId, count]) => ({
      id: repoId,
      repoId,
      count,
      token: `repo:${repoId}`,
      label: `repo:${repoId} (${count})`,
    }));
}

export interface CodeFilterMatchTarget {
  path: string;
  projectName?: string;
  codeLanguage?: string;
  codeKind?: string;
  codeRepo?: string;
}

export function matchesCodeFilters(result: CodeFilterMatchTarget, filters: SearchFilters): boolean {
  if (
    !filters.language.length &&
    !filters.kind.length &&
    !filters.repo.length &&
    !filters.path.length
  ) {
    return true;
  }

  const normalizedLanguage = (result.codeLanguage || "").toLowerCase();
  const normalizedKind = (result.codeKind || "").toLowerCase();
  const normalizedRepo = (result.codeRepo || result.projectName || "").toLowerCase();
  const normalizedPath = result.path.toLowerCase();

  const hasLanguageFilter =
    !filters.language.length ||
    filters.language.some((value) => normalizedLanguage.includes(value));
  const hasKindFilter =
    !filters.kind.length || filters.kind.some((value) => normalizedKind.includes(value));
  const hasRepoFilter =
    !filters.repo.length || filters.repo.some((value) => normalizedRepo.includes(value));
  const hasPathFilter =
    !filters.path.length || filters.path.some((value) => normalizedPath.includes(value));

  return hasLanguageFilter && hasKindFilter && hasRepoFilter && hasPathFilter;
}

export function normalizeCodeLineLabel(line?: number, lineEnd?: number): string | null {
  if (typeof line !== "number") {
    return null;
  }
  if (typeof lineEnd === "number" && lineEnd !== line) {
    return `L${line}-${lineEnd}`;
  }
  return `L${line}`;
}
