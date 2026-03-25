import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SEARCH_BAR_COPY } from '../searchPresentation';
import { SearchInputHeader } from '../SearchInputHeader';

describe('SearchInputHeader suggestions toggle', () => {
  it('renders the suggestions control as an icon-only toggle', () => {
    const onToggleSuggestions = vi.fn();

    render(
      <SearchInputHeader
        inputRef={React.createRef<HTMLInputElement>()}
        copy={SEARCH_BAR_COPY.en}
        locale="en"
        query="solve"
        isLoading={false}
        showSuggestions={false}
        onQueryChange={vi.fn()}
        onToggleSuggestions={onToggleSuggestions}
        onClose={vi.fn()}
        onKeyDown={vi.fn()}
        onCompositionStart={vi.fn()}
        onCompositionEnd={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'Toggle suggestions' });

    expect(button).toHaveAttribute('title', 'Toggle suggestions');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.querySelector('svg')).toBeInTheDocument();
    expect(button).not.toHaveTextContent('Suggestions');

    fireEvent.click(button);
    expect(onToggleSuggestions).toHaveBeenCalledTimes(1);
  });

  it('marks the icon-only toggle as active when suggestions are shown', () => {
    render(
      <SearchInputHeader
        inputRef={React.createRef<HTMLInputElement>()}
        copy={SEARCH_BAR_COPY.en}
        locale="en"
        query="solve"
        isLoading={false}
        showSuggestions
        onQueryChange={vi.fn()}
        onToggleSuggestions={vi.fn()}
        onClose={vi.fn()}
        onKeyDown={vi.fn()}
        onCompositionStart={vi.fn()}
        onCompositionEnd={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'Toggle suggestions' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('active');
    expect(button.querySelector('.search-toolbar-btn-indicator')).toHaveClass('active');
  });
});
