import { useSearchBarInteractions } from './useSearchBarInteractions';
import { useSearchViewProps } from './useSearchViewProps';
import type {
  UseSearchBarViewModelParams,
  UseSearchBarViewModelResult,
} from './searchBarViewModelTypes';

export function useSearchBarViewModel({
  interactions,
  viewState,
  viewActions,
}: UseSearchBarViewModelParams): UseSearchBarViewModelResult {
  const interactionApi = useSearchBarInteractions(interactions);

  const { searchShellProps, searchResultsPanelProps } = useSearchViewProps({
    state: {
      ...viewState,
      isResultPreviewExpanded: interactionApi.isResultPreviewExpanded,
    },
    actions: {
      ...viewActions,
      onRestoreFallbackQuery: interactionApi.handleRestoreFallbackQuery,
      onApplyRepoFacet: interactionApi.handleApplyRepoFacet,
      onInputKeyDown: interactionApi.handleKeyDown,
      onCompositionStart: interactionApi.handleCompositionStart,
      onCompositionEnd: interactionApi.handleCompositionEnd,
      onOpen: interactionApi.handleResultClick,
      onOpenDefinition: interactionApi.handleDefinitionResultClick,
      onOpenReferences: interactionApi.handleReferencesResultClick,
      onOpenGraph: interactionApi.handleGraphResultClick,
      onTogglePreview: interactionApi.toggleCodePreview,
      onPreview: interactionApi.handlePreviewClick,
    },
  });

  return {
    ...interactionApi,
    searchShellProps,
    searchResultsPanelProps,
  };
}
