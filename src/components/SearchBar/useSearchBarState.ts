import { useState } from 'react';
import type { AutocompleteSuggestion } from '../../api';
import type { SearchMeta } from './searchExecution';
import type { SearchResult, SearchScope, SearchSort } from './types';

export function useSearchBarState(): {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  results: SearchResult[];
  setResults: React.Dispatch<React.SetStateAction<SearchResult[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  searchMeta: SearchMeta | null;
  setSearchMeta: React.Dispatch<React.SetStateAction<SearchMeta | null>>;
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  suggestions: AutocompleteSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<AutocompleteSuggestion[]>>;
  showSuggestions: boolean;
  setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  scope: SearchScope;
  setScope: React.Dispatch<React.SetStateAction<SearchScope>>;
  sortMode: SearchSort;
  setSortMode: React.Dispatch<React.SetStateAction<SearchSort>>;
  isComposing: boolean;
  setIsComposing: React.Dispatch<React.SetStateAction<boolean>>;
  drawerResult: SearchResult | null;
  setDrawerResult: React.Dispatch<React.SetStateAction<SearchResult | null>>;
  isDrawerOpen: boolean;
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDrawerLoading: boolean;
  setIsDrawerLoading: React.Dispatch<React.SetStateAction<boolean>>;
} {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [scope, setScope] = useState<SearchScope>('all');
  const [sortMode, setSortMode] = useState<SearchSort>('relevance');
  const [isComposing, setIsComposing] = useState(false);
  const [drawerResult, setDrawerResult] = useState<SearchResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);

  return {
    query,
    setQuery,
    results,
    setResults,
    isLoading,
    setIsLoading,
    searchMeta,
    setSearchMeta,
    selectedIndex,
    setSelectedIndex,
    error,
    setError,
    suggestions,
    setSuggestions,
    showSuggestions,
    setShowSuggestions,
    scope,
    setScope,
    sortMode,
    setSortMode,
    isComposing,
    setIsComposing,
    drawerResult,
    setDrawerResult,
    isDrawerOpen,
    setIsDrawerOpen,
    isDrawerLoading,
    setIsDrawerLoading,
  };
}
