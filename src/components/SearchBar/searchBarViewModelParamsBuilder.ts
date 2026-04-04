import type { UseSearchBarViewModelParams } from "./searchBarViewModelTypes";

export type SearchBarInteractionState = UseSearchBarViewModelParams["interactions"]["state"];
export type SearchBarInteractionActions = UseSearchBarViewModelParams["interactions"]["actions"];
export type SearchBarViewState = UseSearchBarViewModelParams["viewState"];
export type SearchBarViewActions = UseSearchBarViewModelParams["viewActions"];

interface BuildSearchBarViewModelParamsInput {
  interactionState: SearchBarInteractionState;
  interactionActions: SearchBarInteractionActions;
  viewState: SearchBarViewState;
  viewActions: SearchBarViewActions;
}

export function buildSearchBarInteractionState(
  params: SearchBarInteractionState,
): SearchBarInteractionState {
  return {
    ...params,
  };
}

export function buildSearchBarInteractionActions(
  params: SearchBarInteractionActions,
): SearchBarInteractionActions {
  return {
    ...params,
  };
}

export function buildSearchBarViewState(params: SearchBarViewState): SearchBarViewState {
  return {
    ...params,
  };
}

export function buildSearchBarViewActions(params: SearchBarViewActions): SearchBarViewActions {
  return {
    ...params,
  };
}

export function buildSearchBarViewModelParams({
  interactionState,
  interactionActions,
  viewState,
  viewActions,
}: BuildSearchBarViewModelParamsInput): UseSearchBarViewModelParams {
  return {
    interactions: {
      state: interactionState,
      actions: interactionActions,
    },
    viewState,
    viewActions,
  };
}
