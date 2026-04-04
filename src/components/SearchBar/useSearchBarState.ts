import { useState } from 'react';
import type { SearchMeta } from './searchExecution';
import type { SearchScope, SearchSort } from './types';

export function useSearchBarState(): {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  results: SearchResult[];
  setResults: React.Dispatch<React.SetStateAction<SearchResult[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  searchMeta: SearchMeta | null;
  setSearchMeta: React.Dispatch<React.SetStateAction<SearchMeta | null>>;
  resultSelectedIndex: number;
  setResultSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  showSuggestions: boolean;
  setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  scope: SearchScope;
  setScope: React.Dispatch<React.SetStateAction<SearchScope>>;
  sortMode: SearchSort;
  setSortMode: React.Dispatch<React.SetStateAction<SearchSort>>;
  isComposing: boolean;
  setIsComposing: React.Dispatch<React.SetStateAction<boolean>>;
} {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [resultSelectedIndex, setResultSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [scope, setScope] = useState<SearchScope>('all');
  const [sortMode, setSortMode] = useState<SearchSort>('relevance');
  const [isComposing, setIsComposing] = useState(false);
  return {
    query,
    setQuery,
    results,
    setResults,
    isLoading,
    setIsLoading,
    searchMeta,
    setSearchMeta,
    resultSelectedIndex,
    setResultSelectedIndex,
    error,
    setError,
    showSuggestions,
    setShowSuggestions,
    scope,
    setScope,
    sortMode,
    setSortMode,
    isComposing,
    setIsComposing,
  };
}
