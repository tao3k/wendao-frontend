import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { recordPerfTraceSnapshot } from '../../../lib/testPerfRegistry';
import { createPerfTrace } from '../../../lib/testPerfTrace';
import { SearchSuggestionsPanel } from '../SearchSuggestionsPanel';
import { SEARCH_SUGGESTION_RENDER_LIMIT } from '../searchSuggestionBudget';

describe('SearchSuggestionsPanel interaction boundaries', () => {
  it('stops click bubbling while still applying the clicked suggestion', () => {
    const onSuggestionClick = vi.fn();
    const parentClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <SearchSuggestionsPanel
          showSuggestions
          suggestions={[
            {
              text: 'lang:julia',
              suggestionType: 'stem',
            },
          ]}
          selectedIndex={0}
          locale="en"
          renderSuggestionIcon={() => <span data-testid="icon" />}
          onSuggestionClick={onSuggestionClick}
          onSuggestionHover={vi.fn()}
        />
      </div>
    );

    const suggestion = screen.getByText('lang:julia');
    fireEvent.mouseDown(suggestion);
    fireEvent.click(suggestion);

    expect(onSuggestionClick).toHaveBeenCalledWith({
      text: 'lang:julia',
      suggestionType: 'stem',
    });
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('limits the visible dropdown rows to the shared suggestion budget', () => {
    render(
      <SearchSuggestionsPanel
        showSuggestions
        suggestions={Array.from({ length: SEARCH_SUGGESTION_RENDER_LIMIT + 5 }, (_, index) => ({
          text: `lang:julia-${index}`,
          suggestionType: 'stem',
        }))}
        selectedIndex={0}
        locale="en"
        renderSuggestionIcon={() => <span data-testid="icon" />}
        onSuggestionClick={vi.fn()}
        onSuggestionHover={vi.fn()}
      />
    );

    expect(screen.getAllByTestId('search-suggestion-row')).toHaveLength(SEARCH_SUGGESTION_RENDER_LIMIT);
    expect(screen.queryByText(`lang:julia-${SEARCH_SUGGESTION_RENDER_LIMIT}`)).not.toBeInTheDocument();
  });

  it('records a bounded selection-shift trace for the suggestion slice', () => {
    const trace = createPerfTrace('SearchSuggestionsPanel.selection-shift');
    const suggestions = Array.from({ length: SEARCH_SUGGESTION_RENDER_LIMIT }, (_, index) => ({
      text: `lang:julia-${index}`,
      suggestionType: 'stem' as const,
    }));
    const onSuggestionClick = vi.fn();
    const onSuggestionHover = vi.fn();
    const renderSuggestionIcon = vi.fn((suggestion) => {
      trace.increment('suggestion-icon-renders');
      return <span data-testid={`icon-${suggestion.text}`} />;
    });

    const { rerender } = render(
      <SearchSuggestionsPanel
        showSuggestions
        suggestions={suggestions}
        selectedIndex={0}
        locale="en"
        renderSuggestionIcon={renderSuggestionIcon}
        onSuggestionClick={onSuggestionClick}
        onSuggestionHover={onSuggestionHover}
      />
    );

    trace.reset();
    trace.measure('selection-shift', () => {
      rerender(
        <SearchSuggestionsPanel
          showSuggestions
          suggestions={suggestions}
          selectedIndex={1}
          locale="en"
          renderSuggestionIcon={renderSuggestionIcon}
          onSuggestionClick={onSuggestionClick}
          onSuggestionHover={onSuggestionHover}
        />
      );
    });

    const snapshot = trace.snapshot();
    expect(snapshot.counters['selection-shift']).toBe(1);
    expect(snapshot.counters['suggestion-icon-renders']).toBeLessThanOrEqual(2);
    recordPerfTraceSnapshot(
      'SearchSuggestionsPanel selection-shift hot path',
      snapshot,
    );
  });
});
