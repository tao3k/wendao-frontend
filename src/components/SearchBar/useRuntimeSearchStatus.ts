import { useEffect } from 'react';

export interface RuntimeSearchStatus {
  tone: 'warning' | 'error';
  message: string;
  source: 'search';
}

interface UseRuntimeSearchStatusParams {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  warningMessage?: string | null;
  queryToSearch: string;
  runtimeSearchingMessage: string;
  onRuntimeStatusChange?: (status: RuntimeSearchStatus | null) => void;
}

export function useRuntimeSearchStatus({
  isOpen,
  isLoading,
  error,
  warningMessage,
  queryToSearch,
  runtimeSearchingMessage,
  onRuntimeStatusChange,
}: UseRuntimeSearchStatusParams): void {
  useEffect(() => {
    if (!onRuntimeStatusChange) {
      return;
    }

    if (!isOpen) {
      onRuntimeStatusChange(null);
      return;
    }

    if (error) {
      onRuntimeStatusChange({
        tone: 'error',
        message: error,
        source: 'search',
      });
      return;
    }

    if (warningMessage) {
      onRuntimeStatusChange({
        tone: 'warning',
        message: warningMessage,
        source: 'search',
      });
      return;
    }

    if (isLoading && queryToSearch.trim()) {
      onRuntimeStatusChange({
        tone: 'warning',
        message: runtimeSearchingMessage,
        source: 'search',
      });
      return;
    }

    onRuntimeStatusChange(null);
  }, [error, isLoading, isOpen, onRuntimeStatusChange, queryToSearch, runtimeSearchingMessage, warningMessage]);
}
