/**
 * SearchBar component with Ctrl+F shortcut and autocomplete
 *
 * Integrates with the LinkGraphIndex search API for knowledge graph search.
 */

import React from 'react';
import { SearchBarModalContent } from './SearchBarModalContent';
import { buildSearchBarModalContentProps } from './searchBarModalContentProps';
import { useSearchBarController } from './useSearchBarController';
import type { SearchSelection, UiLocale } from './types';
import './SearchBar.css';

interface SearchBarProps {
  isOpen: boolean;
  locale?: UiLocale;
  onClose: () => void;
  onResultSelect: (selection: SearchSelection) => void;
  onReferencesResultSelect?: (selection: SearchSelection) => void;
  onGraphResultSelect?: (selection: SearchSelection) => void;
  onRuntimeStatusChange?: (status: { tone: 'warning' | 'error'; message: string; source: 'search' } | null) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  isOpen,
  locale = 'en',
  onClose,
  onResultSelect,
  onReferencesResultSelect,
  onGraphResultSelect,
  onRuntimeStatusChange,
}) => {
  const controller = useSearchBarController({
    isOpen,
    locale,
    onClose,
    onResultSelect,
    onReferencesResultSelect,
    onGraphResultSelect,
    onRuntimeStatusChange,
  });
  const modalContentProps = buildSearchBarModalContentProps(controller);

  if (!isOpen) return null;

  return (
    <div className="search-overlay" {...controller.overlayProps}>
      <div className="search-modal" {...controller.modalProps}>
        <SearchBarModalContent {...modalContentProps} />
      </div>
    </div>
  );
};
