import { useCodeFilterInteractions } from './useCodeFilterInteractions';
import { useRepoQueryActions } from './useRepoQueryActions';
import { useSearchInputInteractions } from './useSearchInputInteractions';
import { useSearchKeyboardNavigation } from './useSearchKeyboardNavigation';
import { useSearchResultActions } from './useSearchResultActions';
import { useSearchResultPreviewState } from './useSearchResultPreviewState';

type SearchInputInteractionsArgs = Parameters<typeof useSearchInputInteractions>[0];
type CodeFilterInteractionsArgs = Parameters<typeof useCodeFilterInteractions>[0];
type SearchKeyboardNavigationArgs = Parameters<typeof useSearchKeyboardNavigation>[0];
type SearchResultActionsArgs = Parameters<typeof useSearchResultActions>[0];
type RepoQueryActionsArgs = Parameters<typeof useRepoQueryActions>[0];

interface UseSearchBarInteractionsStateParams {
  isComposing: SearchKeyboardNavigationArgs['isComposing'];
  query: SearchKeyboardNavigationArgs['query'];
  suggestions: SearchKeyboardNavigationArgs['suggestions'];
  suggestionCount: SearchKeyboardNavigationArgs['suggestionCount'];
  resultCount: SearchKeyboardNavigationArgs['resultCount'];
  selectedIndex: SearchKeyboardNavigationArgs['selectedIndex'];
  visibleResults: SearchKeyboardNavigationArgs['visibleResults'];
  activeRepoFilter?: RepoQueryActionsArgs['activeRepoFilter'];
  primaryRepoFilter?: RepoQueryActionsArgs['primaryRepoFilter'];
  repoOverviewRepoId?: RepoQueryActionsArgs['repoOverviewRepoId'];
  fallbackFacet?: RepoQueryActionsArgs['fallbackFacet'];
  fallbackFromQuery?: RepoQueryActionsArgs['fallbackFromQuery'];
}

interface UseSearchBarInteractionsActionsParams {
  inputRef: SearchKeyboardNavigationArgs['inputRef'];
  setIsComposing: SearchInputInteractionsArgs['setIsComposing'];
  setQuery: SearchKeyboardNavigationArgs['setQuery'];
  setShowSuggestions: SearchKeyboardNavigationArgs['setShowSuggestions'];
  setSuggestions: SearchKeyboardNavigationArgs['setSuggestions'];
  setSelectedIndex: SearchKeyboardNavigationArgs['setSelectedIndex'];
  setScope: RepoQueryActionsArgs['setScope'];
  onClose: SearchKeyboardNavigationArgs['onClose'];
  onResultSelect: SearchKeyboardNavigationArgs['onResultSelect'];
  onPreviewSelect?: (result: SearchResult) => void;
  onReferencesResultSelect: SearchResultActionsArgs['onReferencesResultSelect'];
  onGraphResultSelect: SearchResultActionsArgs['onGraphResultSelect'];
  setIsLoading: SearchResultActionsArgs['setIsLoading'];
  setError: SearchResultActionsArgs['setError'];
}

interface UseSearchBarInteractionsParams {
  state: UseSearchBarInteractionsStateParams;
  actions: UseSearchBarInteractionsActionsParams;
}

export function useSearchBarInteractions({
  state: {
    isComposing,
    query,
    suggestions,
    suggestionCount,
    resultCount,
    selectedIndex,
    visibleResults,
    activeRepoFilter,
    primaryRepoFilter,
    repoOverviewRepoId,
    fallbackFacet,
    fallbackFromQuery,
  },
  actions: {
    inputRef,
    setIsComposing,
    setQuery,
    setShowSuggestions,
    setSuggestions,
    setSelectedIndex,
    setScope,
    onClose,
    onResultSelect,
    onPreviewSelect,
    onReferencesResultSelect,
    onGraphResultSelect,
    setIsLoading,
    setError,
  },
}: UseSearchBarInteractionsParams) {
  const input = useSearchInputInteractions({
    setIsComposing,
  });
  const codeFilters = useCodeFilterInteractions({
    inputRef,
    setQuery,
    setShowSuggestions,
  });
  const preview = useSearchResultPreviewState();
  const keyboard = useSearchKeyboardNavigation({
    isComposing,
    query,
    suggestions,
    suggestionCount,
    resultCount,
    selectedIndex,
    visibleResults,
    inputRef,
    onClose,
    onResultSelect,
    onPreviewSelect,
    setQuery,
    setShowSuggestions,
    setSuggestions,
    setSelectedIndex,
  });
  const results = useSearchResultActions({
    onPreviewSelect,
    onClose,
    onResultSelect,
    onReferencesResultSelect,
    onGraphResultSelect,
    setIsLoading,
    setError,
  });
  const repo = useRepoQueryActions({
    inputRef,
    setScope,
    setQuery,
    setShowSuggestions,
    activeRepoFilter,
    primaryRepoFilter,
    repoOverviewRepoId,
    fallbackFacet,
    fallbackFromQuery,
  });

  return {
    ...input,
    ...codeFilters,
    ...preview,
    ...keyboard,
    ...results,
    ...repo,
  };
}
