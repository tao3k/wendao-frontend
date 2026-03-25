import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZenSearchLayout } from '../ZenSearchLayout';
vi.mock('../ZenSearchWorkspace', () => ({
  ZenSearchWorkspace: () => <div data-testid="mock-zen-workspace" />,
}));

vi.mock('../ZenSearchShortcutsBar', () => ({
  ZenSearchShortcutsBar: () => <div data-testid="mock-zen-shortcuts" />,
}));

describe('ZenSearchLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dedicated full-screen regions', () => {
    render(
      <ZenSearchLayout
        shellProps={
          {
            copy: {} as never,
            locale: 'en',
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={
          {
            selectedIndex: -1,
            visibleSections: [],
          } as never
        }
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />
    );

    expect(screen.getByTestId('zen-search-layout')).toBeInTheDocument();
    expect(screen.getByTestId('mock-zen-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('mock-zen-shortcuts')).toBeInTheDocument();
  });
});
