import { describe, expect, it, vi } from "vitest";
import {
  buildSearchBarInteractionActions,
  buildSearchBarInteractionState,
  buildSearchBarViewActions,
  buildSearchBarViewModelParams,
  buildSearchBarViewState,
} from "../searchBarViewModelParamsBuilder";
import type {
  SearchBarInteractionActions,
  SearchBarInteractionState,
  SearchBarViewActions,
  SearchBarViewState,
} from "../searchBarViewModelParamsBuilder";

describe("searchBarViewModelParamsBuilder", () => {
  it("builds interaction state and actions from raw params", () => {
    const interactionState = {
      query: "gateway",
      selectedIndex: 2,
    } as unknown as SearchBarInteractionState;
    const interactionActions = {
      setQuery: vi.fn(),
      setSelectedIndex: vi.fn(),
    } as unknown as SearchBarInteractionActions;

    const builtState = buildSearchBarInteractionState(interactionState);
    const builtActions = buildSearchBarInteractionActions(interactionActions);

    expect(builtState).toEqual(interactionState);
    expect(builtActions).toEqual(interactionActions);
    expect(builtState).not.toBe(interactionState);
    expect(builtActions).not.toBe(interactionActions);
  });

  it("builds view state and actions from raw params", () => {
    const viewState = {
      query: "repo:xiuxian",
      isLoading: false,
    } as unknown as SearchBarViewState;
    const viewActions = {
      onQueryChange: vi.fn(),
      onClose: vi.fn(),
    } as unknown as SearchBarViewActions;

    const builtViewState = buildSearchBarViewState(viewState);
    const builtViewActions = buildSearchBarViewActions(viewActions);

    expect(builtViewState).toEqual(viewState);
    expect(builtViewActions).toEqual(viewActions);
    expect(builtViewState).not.toBe(viewState);
    expect(builtViewActions).not.toBe(viewActions);
  });

  it("builds useSearchBarViewModel params envelope", () => {
    const interactionState = { query: "q" } as unknown as SearchBarInteractionState;
    const interactionActions = { onClose: vi.fn() } as unknown as SearchBarInteractionActions;
    const viewState = { query: "q" } as unknown as SearchBarViewState;
    const viewActions = { onClose: vi.fn() } as unknown as SearchBarViewActions;

    const result = buildSearchBarViewModelParams({
      interactionState,
      interactionActions,
      viewState,
      viewActions,
    });

    expect(result.interactions.state).toBe(interactionState);
    expect(result.interactions.actions).toBe(interactionActions);
    expect(result.viewState).toBe(viewState);
    expect(result.viewActions).toBe(viewActions);
  });
});
