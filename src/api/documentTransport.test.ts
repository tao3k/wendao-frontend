import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleResponse } from './responseTransport';
import {
  fetchAutocompleteResponse,
  fetchProjectedPageIndexTreeResponse,
  postRefineEntityDocResponse,
  type DocumentTransportDeps,
} from './documentTransport';

const withUiConfigSyncRetry = vi.fn(async <T>(operation: () => Promise<T>) => operation());

const deps: DocumentTransportDeps = {
  apiBase: '/api',
  handleResponse,
  withUiConfigSyncRetry,
};

describe('document transport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    withUiConfigSyncRetry.mockClear();
  });

  it('fetches autocomplete suggestions from the typeahead endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [{
            label: 'BaseModelica',
            kind: 'symbol',
            detail: 'function',
          }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await fetchAutocompleteResponse(deps, 'Base', 7);

    expect(fetchSpy).toHaveBeenCalledWith('/api/search/autocomplete?prefix=Base&limit=7');
    expect(response.suggestions).toHaveLength(1);
  });

  it('fetches projected page trees behind the UI-config retry gate', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          kind: 'root',
          title: 'Reference',
          children: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await fetchProjectedPageIndexTreeResponse(deps, 'kernel', 'reference:root');

    expect(withUiConfigSyncRetry).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/repo/projected-page-index-tree?repo=kernel&page_id=reference%3Aroot'
    );
    expect(response.title).toBe('Reference');
  });

  it('posts refine-doc requests behind the UI-config retry gate', async () => {
    const request = {
      repo: 'kernel',
      entityId: 'symbol:BaseModelica.solve',
      entityKind: 'symbol',
      entityName: 'solve',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          markdown: '# solve',
          model: 'gpt-5.4',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await postRefineEntityDocResponse(deps, request);

    expect(withUiConfigSyncRetry).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/repo/refine-entity-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    expect(response.markdown).toContain('solve');
  });
});
