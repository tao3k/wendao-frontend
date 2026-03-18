import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, formatShortcut, ShortcutDefinition } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function fireKeyDown(key: string, options: Partial<KeyboardEvent> = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    document.dispatchEvent(event);
    return event;
  }

  it('should trigger action when shortcut key is pressed', () => {
    const saveAction = vi.fn();
    const testShortcuts: ShortcutDefinition[] = [
      { key: 's', ctrl: true, action: saveAction, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(testShortcuts));

    fireKeyDown('s', { ctrlKey: true });

    expect(saveAction).toHaveBeenCalled();
  });

  it('should trigger action with meta key (Mac)', () => {
    const saveAction = vi.fn();
    const testShortcuts: ShortcutDefinition[] = [
      { key: 's', ctrl: true, action: saveAction, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(testShortcuts));

    fireKeyDown('s', { metaKey: true });

    expect(saveAction).toHaveBeenCalled();
  });

  it('should trigger action with shift modifier', () => {
    const redoAction = vi.fn();
    const testShortcuts: ShortcutDefinition[] = [
      { key: 'z', ctrl: true, shift: true, action: redoAction, description: 'Redo' },
    ];

    renderHook(() => useKeyboardShortcuts(testShortcuts));

    fireKeyDown('z', { ctrlKey: true, shiftKey: true });

    expect(redoAction).toHaveBeenCalled();
  });

  it('should trigger Escape without modifiers', () => {
    const cancelAction = vi.fn();
    const testShortcuts: ShortcutDefinition[] = [
      { key: 'Escape', action: cancelAction, description: 'Cancel' },
    ];

    renderHook(() => useKeyboardShortcuts(testShortcuts));

    fireKeyDown('Escape');

    expect(cancelAction).toHaveBeenCalled();
  });

  it('should not trigger when modifiers do not match', () => {
    const saveAction = vi.fn();
    const testShortcuts: ShortcutDefinition[] = [
      { key: 's', ctrl: true, action: saveAction, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(testShortcuts));

    // Press 's' without ctrl
    fireKeyDown('s');

    expect(saveAction).not.toHaveBeenCalled();
  });

  it('should not trigger when typing in input field', () => {
    const saveAction = vi.fn();
    const testShortcuts: ShortcutDefinition[] = [
      { key: 's', ctrl: true, action: saveAction, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(testShortcuts));

    // Create an input element and make it the target
    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });

    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);

    expect(saveAction).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should trigger Escape even in input field', () => {
    const cancelAction = vi.fn();
    const testShortcuts: ShortcutDefinition[] = [
      { key: 'Escape', action: cancelAction, description: 'Cancel' },
    ];

    renderHook(() => useKeyboardShortcuts(testShortcuts));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });

    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);

    expect(cancelAction).toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should prevent default behavior', () => {
    const saveAction = vi.fn();
    const testShortcuts: ShortcutDefinition[] = [
      { key: 's', ctrl: true, action: saveAction, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(testShortcuts));

    const event = fireKeyDown('s', { ctrlKey: true });

    expect(event.defaultPrevented).toBe(true);
  });

  it('should clean up event listener on unmount', () => {
    const saveAction = vi.fn();
    const testShortcuts: ShortcutDefinition[] = [
      { key: 's', ctrl: true, action: saveAction, description: 'Save' },
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts(testShortcuts));

    unmount();

    fireKeyDown('s', { ctrlKey: true });

    expect(saveAction).not.toHaveBeenCalled();
  });
});

describe('formatShortcut', () => {
  it('should format simple key', () => {
    expect(formatShortcut({ key: 'A', action: vi.fn(), description: '' })).toBe('A');
  });

  it('should format key with ctrl', () => {
    expect(
      formatShortcut({ key: 's', ctrl: true, action: vi.fn(), description: '' })
    ).toBe('⌘S');
  });

  it('should format key with ctrl and shift', () => {
    expect(
      formatShortcut({ key: 'z', ctrl: true, shift: true, action: vi.fn(), description: '' })
    ).toBe('⌘⇧Z');
  });

  it('should format key with all modifiers', () => {
    expect(
      formatShortcut({
        key: 'a',
        ctrl: true,
        shift: true,
        alt: true,
        action: vi.fn(),
        description: '',
      })
    ).toBe('⌘⇧⌥A');
  });
});
