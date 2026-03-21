import { describe, expect, it, vi } from 'vitest';
import {
  buildSearchBarInteractionProps,
  createSearchBarModalClickHandler,
} from '../searchBarInteractionPropsBuilder';

describe('searchBarInteractionPropsBuilder', () => {
  it('creates modal click handler that stops event bubbling', () => {
    const stopPropagation = vi.fn();
    const handler = createSearchBarModalClickHandler();

    handler({ stopPropagation } as never);

    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('builds interaction props envelope for controller assembly', () => {
    const onClose = vi.fn();
    const onModalKeyDownCapture = vi.fn();

    const result = buildSearchBarInteractionProps({
      onClose,
      onModalKeyDownCapture,
    });

    expect(result.onOverlayClick).toBe(onClose);
    expect(result.onModalKeyDownCapture).toBe(onModalKeyDownCapture);

    const stopPropagation = vi.fn();
    result.onModalClick({ stopPropagation } as never);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });
});
