import { useEffect, useMemo, useState } from "react";
import { api, getRepoIndexStatusSync, getUiCapabilitiesSync } from "../../api";
import type { SearchResult, SearchScope, UiLocale } from "./types";
import { useCodeFilterCatalog } from "./useCodeFilterCatalog";
import { useCodeFilterPresentation } from "./useCodeFilterPresentation";
import { useRepoSearchState } from "./useRepoSearchState";
import { useSearchSuggestions } from "./useSearchSuggestions";

interface UseSearchBarRepoSliceParams {
  query: string;
  debouncedQuery: string;
  debouncedAutocomplete: string;
  isOpen: boolean;
  scope: SearchScope;
  locale: UiLocale;
  results: SearchResult[];
  showSuggestions: boolean;
  defaultRepoFilter?: string | null;
}

export function useSearchBarRepoSlice({
  query,
  debouncedQuery,
  debouncedAutocomplete,
  isOpen,
  scope,
  locale,
  results,
  showSuggestions,
  defaultRepoFilter,
}: UseSearchBarRepoSliceParams) {
  const repoState = useRepoSearchState({
    query,
    debouncedQuery,
    isOpen,
    scope,
    defaultRepoFilter,
  });

  const [uiCapabilities, setUiCapabilities] = useState(() => getUiCapabilitiesSync());
  const [repoIndexStatus, setRepoIndexStatus] = useState(() => getRepoIndexStatusSync());

  useEffect(() => {
    if (uiCapabilities || typeof api.getUiCapabilities !== "function") {
      return;
    }

    let isActive = true;
    void (async () => {
      try {
        const capabilities = await api.getUiCapabilities();
        if (isActive) {
          setUiCapabilities(capabilities);
        }
      } catch {
        // Search suggestions can fall back to result-derived catalogs when
        // bootstrap capabilities are temporarily unavailable.
      }
    })();

    return () => {
      isActive = false;
    };
  }, [uiCapabilities]);

  useEffect(() => {
    if (!isOpen || repoIndexStatus || typeof api.getRepoIndexStatus !== "function") {
      return;
    }

    let isActive = true;
    void (async () => {
      try {
        const status = await api.getRepoIndexStatus();
        if (isActive) {
          setRepoIndexStatus(status);
        }
      } catch {
        // Repo autocomplete can fall back to capability- or result-derived
        // catalogs when the repo-index status surface is unavailable.
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isOpen, repoIndexStatus]);

  const supportedRepos = useMemo(() => {
    const repoIds = repoIndexStatus?.repos.map((entry) => entry.repoId) ?? [];
    const capabilityRepoIds = uiCapabilities?.supportedRepositories ?? [];
    return Array.from(new Set([...repoIds, ...capabilityRepoIds]));
  }, [repoIndexStatus, uiCapabilities]);

  const supportedKinds =
    uiCapabilities?.searchContract?.codeSearch.backendKindFilters ??
    uiCapabilities?.supportedKinds ??
    [];
  const repoFacetLimit = uiCapabilities?.searchContract?.repoDiscovery.facet.defaultLimit ?? 6;

  const codeFilterCatalog = useCodeFilterCatalog(
    results,
    uiCapabilities?.supportedLanguages ?? [],
    supportedRepos,
    supportedKinds,
  );
  const codeFilterPresentation = useCodeFilterPresentation({
    parsedCodeFilters: repoState.parsedCodeInput.filters,
    codeFilterCatalog,
    results,
    locale,
    repoFacetLimit,
  });

  const autocomplete = useSearchSuggestions({
    isOpen,
    showSuggestions,
    scope,
    debouncedAutocomplete,
    parsedCodeFilters: repoState.parsedCodeInput.filters,
    codeFilterCatalog,
  });

  return {
    ...repoState,
    ...codeFilterPresentation,
    ...autocomplete,
  };
}
