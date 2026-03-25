import { useSearchBarInteractions } from './useSearchBarInteractions';
import { useSearchViewProps } from './useSearchViewProps';

type SearchBarInteractionsParams = Parameters<typeof useSearchBarInteractions>[0];
type SearchViewPropsParams = Parameters<typeof useSearchViewProps>[0];
type SearchViewStateParams = SearchViewPropsParams['state'];
type SearchViewActionsParams = SearchViewPropsParams['actions'];

export interface UseSearchBarViewModelParams {
  interactions: SearchBarInteractionsParams;
  viewState: Omit<SearchViewStateParams, 'isResultPreviewExpanded'>;
  viewActions: Omit<
    SearchViewActionsParams,
    | 'onRestoreFallbackQuery'
    | 'onApplyRepoFacet'
    | 'onInputKeyDown'
    | 'onCompositionStart'
    | 'onCompositionEnd'
    | 'onOpen'
    | 'onOpenDefinition'
    | 'onOpenReferences'
    | 'onOpenGraph'
    | 'onTogglePreview'
    | 'onPreview'
  >;
}

type SearchBarInteractionsResult = ReturnType<typeof useSearchBarInteractions>;
type SearchViewPropsResult = ReturnType<typeof useSearchViewProps>;

export interface UseSearchBarViewModelResult extends SearchBarInteractionsResult {
  searchShellProps: SearchViewPropsResult['searchShellProps'];
  searchResultsPanelProps: SearchViewPropsResult['searchResultsPanelProps'];
}
