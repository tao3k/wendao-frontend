import { useState, useCallback } from 'react';
import { api, ProjectedPageIndexTree } from '../../api';
import type { SearchResult } from './types';

export function useDrawerState() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerResult, setDrawerResult] = useState<SearchResult | null>(null);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  const [projectedTree, setProjectedTree] = useState<ProjectedPageIndexTree | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setDrawerResult(null);
    setProjectedTree(null);
    setDrawerError(null);
  }, []);

  const openDrawer = useCallback(async (result: SearchResult) => {
    setDrawerResult(result);
    setIsDrawerOpen(true);
    
    const repoId = result.codeRepo;
    const pageIds = result.projectionPageIds;

    if (!repoId || !pageIds || pageIds.length === 0) {
      setProjectedTree(null);
      return;
    }

    setIsDrawerLoading(true);
    setDrawerError(null);

    try {
      // For now, we take the first projection page ID associated with the symbol
      const tree = await api.getRepoProjectedPageIndexTree(repoId, pageIds[0]);
      setProjectedTree(tree);
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to load entity details');
      setProjectedTree(null);
    } finally {
      setIsDrawerLoading(false);
    }
  }, []);

  return {
    isDrawerOpen,
    drawerResult,
    isDrawerLoading,
    projectedTree,
    drawerError,
    openDrawer,
    closeDrawer,
  };
}
