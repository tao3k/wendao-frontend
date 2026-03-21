import { describe, expect, it, vi } from 'vitest';
import { buildSearchBarModalContentProps } from '../searchBarModalContentProps';
import type { SearchBarControllerResult } from '../searchBarControllerTypes';

describe('searchBarModalContentProps', () => {
  it('builds modal content props from controller result', () => {
    const shellProps = { query: 'repo:gateway-sync' };
    const resultsPanelProps = { query: 'gateway' };
    const suggestionsPanelProps = { showSuggestions: true };
    const codeFilterHelperProps = { prefixes: ['repo:'] };

    const controller = {
      overlayProps: { onClick: vi.fn() },
      modalProps: { onClick: vi.fn(), onKeyDownCapture: vi.fn() },
      showCodeFilterHelper: true,
      shellProps,
      resultsPanelProps,
      suggestionsPanelProps,
      codeFilterHelperProps,
    } as unknown as SearchBarControllerResult;

    const result = buildSearchBarModalContentProps(controller);

    expect(result).toEqual({
      showCodeFilterHelper: true,
      shellProps,
      resultsPanelProps,
      suggestionsPanelProps,
      codeFilterHelperProps,
    });
  });
});
