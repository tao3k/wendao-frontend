import { tableFromArrays, type Table } from "apache-arrow";
import type { SearchFilters } from "./codeSearchUtils";
import { getSearchResultIdentity } from "./searchResultIdentity";
import { isCodeSearchResult } from "./searchResultNormalization";
import type { SearchResult, SearchScope, SearchSort } from "./types";

export interface ArrowSearchResultView {
  table: Table;
  rowCount: number;
  getVisibleResults(
    scope: SearchScope,
    sortMode: SearchSort,
    filters: SearchFilters,
  ): SearchResult[];
  buildCodeFilterCatalog(
    supportedLanguages?: string[],
    supportedRepos?: string[],
    supportedKinds?: string[],
  ): SearchFilters;
}

function normalizeScore(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeCatalogValue(value?: string): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function pushUniqueValue(catalog: SearchFilters, key: keyof SearchFilters, value?: string): void {
  const normalized = normalizeCatalogValue(value);
  if (!normalized || catalog[key].includes(normalized)) {
    return;
  }
  catalog[key].push(normalized);
}

function pushUniqueValues(
  catalog: SearchFilters,
  key: keyof SearchFilters,
  values: string[],
): void {
  values.forEach((value) => pushUniqueValue(catalog, key, value));
}

function matchesArrowCodeFilters(
  rowIndex: number,
  filters: SearchFilters,
  readLanguage: (index: number) => string,
  readKind: (index: number) => string,
  readRepo: (index: number) => string,
  readPath: (index: number) => string,
): boolean {
  if (
    !filters.language.length &&
    !filters.kind.length &&
    !filters.repo.length &&
    !filters.path.length
  ) {
    return true;
  }

  const language = readLanguage(rowIndex);
  const kind = readKind(rowIndex);
  const repo = readRepo(rowIndex);
  const path = readPath(rowIndex);

  const hasLanguageFilter =
    !filters.language.length || filters.language.some((value) => language.includes(value));
  const hasKindFilter = !filters.kind.length || filters.kind.some((value) => kind.includes(value));
  const hasRepoFilter = !filters.repo.length || filters.repo.some((value) => repo.includes(value));
  const hasPathFilter = !filters.path.length || filters.path.some((value) => path.includes(value));

  return hasLanguageFilter && hasKindFilter && hasRepoFilter && hasPathFilter;
}

function hasActiveCodeFilters(filters: SearchFilters): boolean {
  return Boolean(
    filters.language.length || filters.kind.length || filters.repo.length || filters.path.length,
  );
}

export function buildArrowSearchResultView(
  results: readonly SearchResult[],
): ArrowSearchResultView {
  const table = tableFromArrays({
    rowIndex: Int32Array.from(results.map((_, index) => index)),
    identity: results.map((result) => getSearchResultIdentity(result)),
    category: results.map((result) => result.category),
    path: results.map((result) => result.path),
    pathLower: results.map((result) => result.path.toLowerCase()),
    score: Float64Array.from(results.map((result) => normalizeScore(result.score))),
    codeLanguage: results.map((result) => (result.codeLanguage ?? "").toLowerCase()),
    codeKind: results.map((result) => (result.codeKind ?? "").toLowerCase()),
    codeRepo: results.map((result) => (result.codeRepo ?? result.projectName ?? "").toLowerCase()),
  });

  const rowIndexVector = table.getChild("rowIndex");
  const identityVector = table.getChild("identity");
  const categoryVector = table.getChild("category");
  const pathVector = table.getChild("path");
  const pathLowerVector = table.getChild("pathLower");
  const scoreVector = table.getChild("score");
  const codeLanguageVector = table.getChild("codeLanguage");
  const codeKindVector = table.getChild("codeKind");
  const codeRepoVector = table.getChild("codeRepo");

  const readInt = (index: number): number => Number(rowIndexVector?.get(index) ?? -1);
  const readIdentity = (index: number): string => String(identityVector?.get(index) ?? "");
  const readCategory = (index: number): string => String(categoryVector?.get(index) ?? "");
  const readPath = (index: number): string => String(pathVector?.get(index) ?? "");
  const readPathLower = (index: number): string => String(pathLowerVector?.get(index) ?? "");
  const readScore = (index: number): number => normalizeScore(Number(scoreVector?.get(index) ?? 0));
  const readLanguage = (index: number): string => String(codeLanguageVector?.get(index) ?? "");
  const readKind = (index: number): string => String(codeKindVector?.get(index) ?? "");
  const readRepo = (index: number): string => String(codeRepoVector?.get(index) ?? "");
  const sortVisibleRowIndices = (visibleRowIndices: number[], sortMode: SearchSort): number[] => {
    const sorted = [...visibleRowIndices];
    sorted.sort((left, right) => {
      if (sortMode === "path") {
        return readPath(left).localeCompare(readPath(right));
      }
      return readScore(right) - readScore(left);
    });
    return sorted;
  };
  const collectVisibleRowIndices = (
    includeRow: (index: number, result: SearchResult) => boolean,
  ): number[] => {
    const dedupedRowMap = new Map<string, number>();

    for (let index = 0; index < table.numRows; index += 1) {
      const rowIndex = readInt(index);
      const result = results[rowIndex];
      if (!result || !includeRow(index, result)) {
        continue;
      }

      const identity = readIdentity(index);
      const existingRow = dedupedRowMap.get(identity);
      if (existingRow == null || readScore(index) > readScore(existingRow)) {
        dedupedRowMap.set(identity, index);
      }
    }

    return Array.from(dedupedRowMap.values());
  };

  return {
    table,
    rowCount: table.numRows,
    getVisibleResults(
      scope: SearchScope,
      sortMode: SearchSort,
      filters: SearchFilters,
    ): SearchResult[] {
      if (scope === "all" && hasActiveCodeFilters(filters)) {
        const matchingCodeRows = collectVisibleRowIndices(
          (index, result) =>
            isCodeSearchResult(result) &&
            matchesArrowCodeFilters(
              index,
              filters,
              readLanguage,
              readKind,
              readRepo,
              readPathLower,
            ),
        );
        return sortVisibleRowIndices(matchingCodeRows, sortMode)
          .map((index) => results[readInt(index)])
          .filter((result): result is SearchResult => Boolean(result));
      }

      const visibleRowIndices = collectVisibleRowIndices((index, result) => {
        if (scope === "all") {
          if (
            isCodeSearchResult(result) &&
            hasActiveCodeFilters(filters) &&
            !matchesArrowCodeFilters(
              index,
              filters,
              readLanguage,
              readKind,
              readRepo,
              readPathLower,
            )
          ) {
            return false;
          }
          return true;
        }

        if (scope === "code") {
          return (
            isCodeSearchResult(result) &&
            matchesArrowCodeFilters(index, filters, readLanguage, readKind, readRepo, readPathLower)
          );
        }

        return readCategory(index) === scope;
      });

      return sortVisibleRowIndices(visibleRowIndices, sortMode)
        .map((index) => results[readInt(index)])
        .filter((result): result is SearchResult => Boolean(result));
    },
    buildCodeFilterCatalog(
      supportedLanguages: string[] = [],
      supportedRepos: string[] = [],
      supportedKinds: string[] = [],
    ): SearchFilters {
      const catalog: SearchFilters = {
        language: [],
        kind: [],
        repo: [],
        path: [],
      };

      for (let index = 0; index < table.numRows; index += 1) {
        const rowIndex = readInt(index);
        const result = results[rowIndex];
        if (!result || !isCodeSearchResult(result)) {
          continue;
        }

        pushUniqueValue(catalog, "kind", readKind(index));
        pushUniqueValue(catalog, "repo", readRepo(index));

        const normalizedPath = readPathLower(index).replace(/^\/+/, "");
        if (!normalizedPath) {
          continue;
        }

        const segments = normalizedPath.split("/").filter(Boolean);
        if (segments.length > 0) {
          pushUniqueValue(
            catalog,
            "path",
            segments.slice(0, Math.min(3, segments.length)).join("/"),
          );
        }
        pushUniqueValue(catalog, "path", normalizedPath);
      }

      pushUniqueValues(catalog, "language", supportedLanguages);
      pushUniqueValues(catalog, "repo", supportedRepos);
      pushUniqueValues(catalog, "kind", supportedKinds);

      return catalog;
    },
  };
}
