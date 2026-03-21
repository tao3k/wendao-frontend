import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { SearchScope } from './types';

interface UseRepoOverviewStatusParams {
  isOpen: boolean;
  scope: SearchScope;
  repoFilter?: string;
}

export interface RepoOverviewStatusSnapshot {
  repoId: string;
  moduleCount: number;
  symbolCount: number;
  exampleCount: number;
  docCount: number;
}

export function useRepoOverviewStatus({
  isOpen,
  scope,
  repoFilter,
}: UseRepoOverviewStatusParams): { repoOverviewStatus: RepoOverviewStatusSnapshot | null } {
  const [repoOverviewStatus, setRepoOverviewStatus] = useState<RepoOverviewStatusSnapshot | null>(null);

  useEffect(() => {
    const normalizedRepo = repoFilter?.trim();
    if (!isOpen || scope !== 'code' || !normalizedRepo) {
      setRepoOverviewStatus(null);
      return;
    }

    let cancelled = false;

    const loadOverview = async () => {
      try {
        const response = await api.getRepoOverview(normalizedRepo);
        if (cancelled) {
          return;
        }
        setRepoOverviewStatus({
          repoId: response.repoId,
          moduleCount: response.moduleCount,
          symbolCount: response.symbolCount,
          exampleCount: response.exampleCount,
          docCount: response.docCount,
        });
      } catch {
        if (cancelled) {
          return;
        }
        setRepoOverviewStatus(null);
      }
    };

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [isOpen, repoFilter, scope]);

  return { repoOverviewStatus };
}
