/**
 * Tests for useAccessibility hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccessibility } from './useAccessibility';

// Mock matchMedia
const createMediaQueryList = (matches: boolean) => ({
  matches,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('useAccessibility', () => {
  let matchMediaSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    matchMediaSpy = vi.spyOn(window, 'matchMedia');
  });

  afterEach(() => {
    matchMediaSpy.mockRestore();
  });

  describe('initial state', () => {
    it('should return default values when no preferences are set', () => {
      matchMediaSpy.mockImplementation(() => {
        return createMediaQueryList(false);
      });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.prefersReducedMotion).toBe(false);
      expect(result.current.prefersHighContrast).toBe(false);
    });
  });

  describe('prefers-reduced-motion', () => {
    it('should return true when user prefers reduced motion', () => {
      matchMediaSpy.mockImplementation((query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return createMediaQueryList(true);
        }
        return createMediaQueryList(false);
      });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.prefersReducedMotion).toBe(true);
    });

    it('should update when preference changes', () => {
      const motionListeners: Array<(e: MediaQueryListEvent) => void> = [];

      matchMediaSpy.mockImplementation((query: string) => {
        const mql = createMediaQueryList(false);
        mql.addEventListener = vi.fn((event, listener) => {
          if (event === 'change' && query === '(prefers-reduced-motion: reduce)') {
            motionListeners.push(listener as (e: MediaQueryListEvent) => void);
          }
        });
        return mql;
      });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.prefersReducedMotion).toBe(false);

      // Simulate preference change
      act(() => {
        motionListeners.forEach((listener) => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(result.current.prefersReducedMotion).toBe(true);
    });
  });

  describe('prefers-contrast', () => {
    it('should return true when user prefers high contrast', () => {
      matchMediaSpy.mockImplementation((query: string) => {
        if (query === '(prefers-contrast: high)') {
          return createMediaQueryList(true);
        }
        return createMediaQueryList(false);
      });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.prefersHighContrast).toBe(true);
    });
  });

  describe('prefers-color-scheme', () => {
    it('should return prefersDark true when user prefers dark mode', () => {
      matchMediaSpy.mockImplementation((query: string) => {
        if (query === '(prefers-color-scheme: dark)') {
          return createMediaQueryList(true);
        }
        return createMediaQueryList(false);
      });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.prefersDark).toBe(true);
      expect(result.current.prefersLight).toBe(false);
    });

    it('should return prefersLight true when user prefers light mode', () => {
      matchMediaSpy.mockImplementation((query: string) => {
        if (query === '(prefers-color-scheme: light)') {
          return createMediaQueryList(true);
        }
        return createMediaQueryList(false);
      });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.prefersLight).toBe(true);
      expect(result.current.prefersDark).toBe(false);
    });
  });

  describe('getDuration', () => {
    it('should return 0 when prefersReducedMotion is true', () => {
      matchMediaSpy.mockImplementation((query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return createMediaQueryList(true);
        }
        return createMediaQueryList(false);
      });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.getDuration(500)).toBe(0);
      expect(result.current.getDuration(1000)).toBe(0);
    });

    it('should return original duration when prefersReducedMotion is false', () => {
      matchMediaSpy.mockImplementation(() => createMediaQueryList(false));

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.getDuration(500)).toBe(500);
      expect(result.current.getDuration(1000)).toBe(1000);
    });
  });

  describe('getTransition', () => {
    it('should return "none" when prefersReducedMotion is true', () => {
      matchMediaSpy.mockImplementation((query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return createMediaQueryList(true);
        }
        return createMediaQueryList(false);
      });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.getTransition('all 0.3s ease')).toBe('none');
    });

    it('should return original transition when prefersReducedMotion is false', () => {
      matchMediaSpy.mockImplementation(() => createMediaQueryList(false));

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.getTransition('all 0.3s ease')).toBe('all 0.3s ease');
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerMocks: Array<ReturnType<typeof vi.fn>> = [];

      matchMediaSpy.mockImplementation(() => {
        const mql = createMediaQueryList(false);
        const removeMock = vi.fn();
        mql.removeEventListener = removeMock;
        removeEventListenerMocks.push(removeMock);
        return mql;
      });

      const { unmount } = renderHook(() => useAccessibility());

      unmount();

      // Should have called removeEventListener for each query
      removeEventListenerMocks.forEach((mock) => {
        expect(mock).toHaveBeenCalled();
      });
    });
  });
});
