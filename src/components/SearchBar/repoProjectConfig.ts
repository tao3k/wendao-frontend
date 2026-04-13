import { getUiConfigSync } from "../../api";
import {
  CODE_FILTER_PREFIXES,
  hasStructuralCodeQuery,
  inferStructuralSearchLanguage,
  parseCodeFilters,
} from "./codeSearchUtils";

const SEARCH_ONLY_REPO_PLUGINS = new Set(["ast-grep"]);
const REPO_QUERY_STOPWORDS = new Set(["project", "repo"]);

function normalizeLiteral(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeToken(rawToken: string): string {
  return rawToken
    .trim()
    .replace(/^[`"'([{]+/, "")
    .replace(/[`"')\]},.]+$/g, "")
    .toLowerCase();
}

function repoProjectFields(project: { id: string; root?: string; url?: string }): string[] {
  return [project.id, project.url, project.root]
    .map(normalizeLiteral)
    .filter((value): value is string => Boolean(value));
}

function isControlToken(token: string): boolean {
  const separatorIndex = token.indexOf(":");
  if (separatorIndex <= 0) {
    return false;
  }
  const prefix = token.slice(0, separatorIndex).toLowerCase();
  return CODE_FILTER_PREFIXES.includes(prefix as (typeof CODE_FILTER_PREFIXES)[number]);
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripStandaloneToken(query: string, token: string): string {
  const pattern = new RegExp(`(^|\\s+)${escapeForRegex(token)}(?=\\s+|$)`, "i");
  return query.replace(pattern, " ").replace(/\s+/g, " ").trim();
}

function stripExplicitRepoFilters(query: string): string {
  return query
    .split(/\s+/)
    .filter((token) => !token.toLowerCase().startsWith("repo:"))
    .join(" ")
    .trim();
}

function repoQueryTokens(query: string): string[] {
  if (!query.trim()) {
    return [];
  }

  return query
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 0)
    .filter((token) => !REPO_QUERY_STOPWORDS.has(token))
    .filter((token) => !isControlToken(token));
}

function findConfiguredRepoProject(repoId: string) {
  return (getUiConfigSync()?.repoProjects ?? []).find(
    (project) => project.id.trim().toLowerCase() === repoId.trim().toLowerCase(),
  );
}

export function inferRepoFilterFromConfiguredFields(query: string): string | undefined {
  const repoProjects = getUiConfigSync()?.repoProjects ?? [];
  const tokens = repoQueryTokens(query);

  if (tokens.length === 0 || repoProjects.length === 0) {
    return undefined;
  }

  let bestMatch: { id: string; score: number } | null = null;
  let isTie = false;

  for (const project of repoProjects) {
    const fields = repoProjectFields(project);
    const score = tokens.reduce((total, token) => {
      if (fields.some((field) => field === token)) {
        return total + 4;
      }
      if (fields.some((field) => field.includes(token))) {
        return total + 2;
      }
      if (fields.some((field) => token.includes(field))) {
        return total + 1;
      }
      return total;
    }, 0);

    if (score <= 0) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { id: project.id, score };
      isTie = false;
      continue;
    }

    if (score === bestMatch.score) {
      isTie = true;
    }
  }

  return bestMatch && !isTie ? bestMatch.id : undefined;
}

export function isSearchOnlyRepoProject(repoId: string): boolean {
  const plugins =
    findConfiguredRepoProject(repoId)?.plugins.map((plugin) => plugin.toLowerCase()) ?? [];
  return plugins.length > 0 && plugins.every((plugin) => SEARCH_ONLY_REPO_PLUGINS.has(plugin));
}

export function buildSearchOnlyRepoPlaceholderQuery(query: string, repoId: string): string | null {
  const repoProject = findConfiguredRepoProject(repoId);
  if (!repoProject || !isSearchOnlyRepoProject(repoId) || hasStructuralCodeQuery(query)) {
    return null;
  }

  const tokens = repoQueryTokens(query);
  const repoFields = repoProjectFields(repoProject);
  const repoTokens = tokens.filter((token) => repoFields.some((field) => field.includes(token)));

  let strippedQuery = stripExplicitRepoFilters(query);
  for (const token of new Set(repoTokens)) {
    strippedQuery = stripStandaloneToken(strippedQuery, token);
  }

  const normalizedQuery = strippedQuery.trim();
  return normalizedQuery.length > 0 ? `${normalizedQuery} ast:"$PATTERN"` : 'ast:"$PATTERN"';
}

export function resolveRepoScopedBackendCodeSearchQuery(
  query: string,
  repoId: string,
  repoFacet?: string | null,
): string | null {
  if (repoFacet != null) {
    return null;
  }

  const placeholderAnalysisQuery = buildSearchOnlyRepoPlaceholderQuery(query, repoId);
  const parsedCodeFilters = parseCodeFilters(query);
  const shouldUseBackendCodeSearch =
    placeholderAnalysisQuery !== null ||
    hasStructuralCodeQuery(query) ||
    inferStructuralSearchLanguage(parsedCodeFilters.filters) !== null;

  return shouldUseBackendCodeSearch ? (placeholderAnalysisQuery ?? query) : null;
}
