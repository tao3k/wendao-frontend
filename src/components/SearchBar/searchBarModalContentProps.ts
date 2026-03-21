import type {
  SearchBarControllerCodeFilterHelperProps,
  SearchBarControllerResult,
  SearchBarControllerResultsPanelProps,
  SearchBarControllerShellProps,
  SearchBarControllerSuggestionsPanelProps,
} from './searchBarControllerTypes';

export interface SearchBarModalContentProps {
  showCodeFilterHelper: boolean;
  shellProps: SearchBarControllerShellProps;
  resultsPanelProps: SearchBarControllerResultsPanelProps;
  suggestionsPanelProps: SearchBarControllerSuggestionsPanelProps;
  codeFilterHelperProps: SearchBarControllerCodeFilterHelperProps;
}

export function buildSearchBarModalContentProps(
  controller: SearchBarControllerResult
): SearchBarModalContentProps {
  return {
    showCodeFilterHelper: controller.showCodeFilterHelper,
    shellProps: controller.shellProps,
    resultsPanelProps: controller.resultsPanelProps,
    suggestionsPanelProps: controller.suggestionsPanelProps,
    codeFilterHelperProps: controller.codeFilterHelperProps,
  };
}
