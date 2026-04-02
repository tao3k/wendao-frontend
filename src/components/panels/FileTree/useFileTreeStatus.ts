import { useEffect } from 'react';
import type { RepoIndexStatus } from '../../statusBar/types';
import type { FileTreeProps } from './types';

interface UseFileTreeStatusOptions {
  error: string | null;
  isLoading: boolean;
  onStatusChange?: FileTreeProps['onStatusChange'];
  repoIndexStatus: RepoIndexStatus | null;
}

export function useFileTreeStatus({
  error,
  isLoading,
  onStatusChange,
  repoIndexStatus,
}: UseFileTreeStatusOptions) {
  useEffect(() => {
    onStatusChange?.({
      vfsStatus: { isLoading, error },
      repoIndexStatus,
    });
  }, [error, isLoading, onStatusChange, repoIndexStatus]);
}
