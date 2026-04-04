import type { SearchBarControllerModalProps } from "./searchBarControllerTypes";

export interface SearchBarInteractionProps {
  onModalClick: SearchBarControllerModalProps["onClick"];
  onModalKeyDownCapture: SearchBarControllerModalProps["onKeyDownCapture"];
}

interface BuildSearchBarInteractionPropsParams {
  onModalKeyDownCapture: SearchBarControllerModalProps["onKeyDownCapture"];
}

export function createSearchBarModalClickHandler(): SearchBarControllerModalProps["onClick"] {
  return (event) => {
    event.stopPropagation();
  };
}

export function buildSearchBarInteractionProps({
  onModalKeyDownCapture,
}: BuildSearchBarInteractionPropsParams): SearchBarInteractionProps {
  return {
    onModalClick: createSearchBarModalClickHandler(),
    onModalKeyDownCapture,
  };
}
