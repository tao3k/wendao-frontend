import { describe, expect, it } from "vitest";
import {
  buildVisibleSearchSuggestions,
  SEARCH_SUGGESTION_RENDER_LIMIT,
} from "../searchSuggestionBudget";

describe("searchSuggestionBudget", () => {
  it("caps visible suggestions to the shared dropdown budget", () => {
    const visibleSuggestions = buildVisibleSearchSuggestions(
      Array.from({ length: SEARCH_SUGGESTION_RENDER_LIMIT + 6 }, (_, index) => ({
        text: `lang:julia-${index}`,
        suggestionType: "stem" as const,
      })),
    );

    expect(visibleSuggestions).toHaveLength(SEARCH_SUGGESTION_RENDER_LIMIT);
    expect(visibleSuggestions.at(-1)?.text).toBe(
      `lang:julia-${SEARCH_SUGGESTION_RENDER_LIMIT - 1}`,
    );
  });
});
