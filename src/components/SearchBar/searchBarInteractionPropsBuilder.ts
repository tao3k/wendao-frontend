import type { SearchBarControllerModalProps } from './searchBarControllerTypes';

export interface SearchBarInteractionProps {
  onOverlayClick: () => void;
  onModalClick: SearchBarControllerModalProps['onClick'];
  onModalKeyDownCapture: SearchBarControllerModalProps['onKeyDownCapture'];
}

interface BuildSearchBarInteractionPropsParams {
  onClose: () => void;
  onModalKeyDownCapture: SearchBarControllerModalProps['onKeyDownCapture'];
}

export function createSearchBarModalClickHandler(): SearchBarControllerModalProps['onClick'] {
  return (event) => {
    event.stopPropagation();
  };
}

export function buildSearchBarInteractionProps({
  onClose,
  onModalKeyDownCapture,
}: BuildSearchBarInteractionPropsParams): SearchBarInteractionProps {
  return {
    onOverlayClick: onClose,
    onModalClick: createSearchBarModalClickHandler(),
    onModalKeyDownCapture,
  };
}
