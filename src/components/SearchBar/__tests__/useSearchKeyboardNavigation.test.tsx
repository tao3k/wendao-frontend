import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AutocompleteSuggestion } from '../../../api';
import type { KeyboardEvent } from 'react';
import { useSearchKeyboardNavigation } from '../useSearchKeyboardNavigation';

function buildTabEvent() {
  return {
    key: 'Tab',
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    nativeEvent: { isComposing: false },
  } as unknown as KeyboardEvent;
}

function buildSuggestion(text: string): AutocompleteSuggestion {
  return {
    text,
    suggestionType: 'stem',
  };
}

describe('useSearchKeyboardNavigation tab behavior', () => {
  it('keeps suggestions enabled when tab completes a suggestion', () => {
    const setQuery = vi.fn();
    const setShowSuggestions = vi.fn();
    const setSuggestions = vi.fn();
    const setSelectedIndex = vi.fn();
    const event = buildTabEvent();

    const { result } = renderHook(() =>
      useSearchKeyboardNavigation({
        isComposing: false,
        query: 'sol',
        suggestions: [buildSuggestion('solve')],
        suggestionCount: 1,
        resultCount: 0,
        selectedIndex: 0,
        visibleResults: [],
        inputRef: { current: null },
        onClose: vi.fn(),
        onResultSelect: vi.fn(),
        setQuery,
        setShowSuggestions,
        setSuggestions,
        setSelectedIndex,
      })
    );

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(setQuery).toHaveBeenCalledWith('solve');
    expect(setShowSuggestions).toHaveBeenCalledWith(true);
    expect(setSuggestions).toHaveBeenCalledWith([]);
    expect(setSelectedIndex).toHaveBeenCalledWith(0);
  });

  it('does not block tab when suggestion completion is unavailable', () => {
    const setQuery = vi.fn();
    const setShowSuggestions = vi.fn();
    const setSuggestions = vi.fn();
    const setSelectedIndex = vi.fn();
    const event = buildTabEvent();

    const { result } = renderHook(() =>
      useSearchKeyboardNavigation({
        isComposing: false,
        query: 'sol',
        suggestions: [],
        suggestionCount: 0,
        resultCount: 0,
        selectedIndex: 0,
        visibleResults: [],
        inputRef: { current: null },
        onClose: vi.fn(),
        onResultSelect: vi.fn(),
        setQuery,
        setShowSuggestions,
        setSuggestions,
        setSelectedIndex,
      })
    );

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(setQuery).not.toHaveBeenCalled();
    expect(setShowSuggestions).not.toHaveBeenCalled();
    expect(setSuggestions).not.toHaveBeenCalled();
    expect(setSelectedIndex).not.toHaveBeenCalled();
  });
});
