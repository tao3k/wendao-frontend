import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SEARCH_BAR_COPY } from '../searchPresentation';
import { SearchStatusBar } from '../SearchStatusBar';

describe('SearchStatusBar repo overview facets', () => {
  it('applies repo facet when count is positive', () => {
    const onApplyRepoFacet = vi.fn();

    render(
      <SearchStatusBar
        query="solve"
        searchMeta={{ query: 'solve', hitCount: 4, selectedMode: 'Code' }}
        copy={SEARCH_BAR_COPY.en}
        modeLabel="Code"
        confidenceLabel="High"
        confidenceTone="high"
        repoOverviewStatus={{
          repoId: 'gateway-sync',
          moduleCount: 1,
          symbolCount: 2,
          exampleCount: 1,
          docCount: 3,
        }}
        repoSyncStatus={null}
        onApplyRepoFacet={onApplyRepoFacet}
        scope="code"
        sortMode="relevance"
        locale="en"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Filter by modules' }));
    expect(onApplyRepoFacet).toHaveBeenCalledWith('module');
    expect(screen.getByRole('button', { name: 'Filter by modules' })).toHaveAttribute(
      'title',
      'Filter by modules: repo:gateway-sync kind:module module'
    );
  });

  it('disables facet action when count is zero', () => {
    const onApplyRepoFacet = vi.fn();

    render(
      <SearchStatusBar
        query="solve"
        searchMeta={{ query: 'solve', hitCount: 1, selectedMode: 'Code' }}
        copy={SEARCH_BAR_COPY.en}
        modeLabel="Code"
        confidenceLabel="High"
        confidenceTone="high"
        repoOverviewStatus={{
          repoId: 'gateway-sync',
          moduleCount: 0,
          symbolCount: 0,
          exampleCount: 0,
          docCount: 0,
        }}
        repoSyncStatus={null}
        onApplyRepoFacet={onApplyRepoFacet}
        scope="code"
        sortMode="relevance"
        locale="en"
      />
    );

    const moduleButton = screen.getByRole('button', { name: 'Filter by modules' });
    expect(moduleButton).toBeDisabled();
    fireEvent.click(moduleButton);
    expect(onApplyRepoFacet).not.toHaveBeenCalled();
  });

  it('renders fallback status when provided', () => {
    const onRestoreFallbackQuery = vi.fn();

    render(
      <SearchStatusBar
        query="module"
        searchMeta={{
          query: 'module',
          hitCount: 1,
          selectedMode: 'Code',
          repoFallbackFacet: 'module',
          repoFallbackFromQuery: 'module',
          repoFallbackToQuery: 'GatewaySyncPkg',
        }}
        copy={SEARCH_BAR_COPY.en}
        modeLabel="Code"
        confidenceLabel="High"
        confidenceTone="high"
        fallbackLabel="module: module -> GatewaySyncPkg"
        onRestoreFallbackQuery={onRestoreFallbackQuery}
        repoOverviewStatus={null}
        repoSyncStatus={null}
        scope="code"
        sortMode="relevance"
        locale="en"
      />
    );

    expect(screen.getByText('Fallback: module: module -> GatewaySyncPkg')).toBeInTheDocument();
    const fallbackButton = screen.getByRole('button', { name: 'Restore original query' });
    expect(fallbackButton).toHaveAttribute('title', 'Restore original query');
    fireEvent.click(fallbackButton);
    expect(onRestoreFallbackQuery).toHaveBeenCalledTimes(1);
  });

  it('renders backend intent signal when available', () => {
    render(
      <SearchStatusBar
        query="solve"
        searchMeta={{
          query: 'solve',
          hitCount: 2,
          selectedMode: 'intent_hybrid',
          searchMode: 'intent_hybrid',
          intent: 'debug_lookup',
          intentConfidence: 0.91,
        }}
        copy={SEARCH_BAR_COPY.en}
        modeLabel="intent_hybrid"
        confidenceLabel="High"
        confidenceTone="high"
        repoOverviewStatus={null}
        repoSyncStatus={null}
        scope="knowledge"
        sortMode="relevance"
        locale="en"
      />
    );

    expect(screen.getByText('Intent: debug_lookup (91%)')).toBeInTheDocument();
  });
});
