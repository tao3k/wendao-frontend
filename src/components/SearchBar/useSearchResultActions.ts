import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api } from '../../api';
import { resolveDefinitionSelection, toSearchSelection } from './searchResultNormalization';
import type { SearchResult, SearchSelection } from './types';

interface UseSearchResultActionsParams {
  onClose: () => void;
  onResultSelect: (selection: SearchSelection) => void;
  onPreviewSelect?: (result: SearchResult) => void;
  onReferencesResultSelect?: (selection: SearchSelection) => void;
  onGraphResultSelect?: (selection: SearchSelection) => void;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

interface UseSearchResultActionsResult {
  handleResultClick: (result: SearchResult, event?: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
  handleGraphResultClick: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  handleReferencesResultClick: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  handleDefinitionResultClick: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  handlePreviewClick: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function useSearchResultActions({
  onClose,
  onResultSelect,
  onPreviewSelect,
  onReferencesResultSelect,
  onGraphResultSelect,
  setIsLoading,
  setError,
}: UseSearchResultActionsParams): UseSearchResultActionsResult {
  const handleResultClick = useCallback(
    (result: SearchResult, event?: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
      event?.preventDefault();
      event?.stopPropagation();
      onResultSelect(toSearchSelection(result));
      onClose();
    },
    [onClose, onResultSelect]
  );

  const handleGraphResultClick = useCallback(
    (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onGraphResultSelect?.(toSearchSelection(result));
    },
    [onGraphResultSelect]
  );

  const handleReferencesResultClick = useCallback(
    (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onReferencesResultSelect?.(toSearchSelection(result));
      onClose();
    },
    [onClose, onReferencesResultSelect]
  );

  const handleDefinitionResultClick = useCallback(
    async (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.resolveDefinition(result.stem, {
          path: result.path,
          ...(typeof result.line === 'number' ? { line: result.line } : {}),
        });
        onResultSelect(resolveDefinitionSelection(result, response));
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Definition lookup failed');
      } finally {
        setIsLoading(false);
      }
    },
    [onClose, onResultSelect, setError, setIsLoading]
  );

  const handlePreviewClick = useCallback(
    (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onPreviewSelect?.(result);
    },
    [onPreviewSelect]
  );

  return {
    handleResultClick,
    handleGraphResultClick,
    handleReferencesResultClick,
    handleDefinitionResultClick,
    handlePreviewClick,
  };
}
