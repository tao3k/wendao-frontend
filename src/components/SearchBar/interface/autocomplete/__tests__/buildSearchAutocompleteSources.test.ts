import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildSearchAutocompleteSources } from "../buildSearchAutocompleteSources";

const searchAutocompleteMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../../api", () => ({
  api: {
    searchAutocomplete: searchAutocompleteMock,
  },
}));

describe("buildSearchAutocompleteSources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps all-scope filter-only queries local", async () => {
    const sources = buildSearchAutocompleteSources({
      scope: "all",
      rawQuery: "lang:j",
      parsedCodeFilters: {
        language: [],
        kind: [],
        repo: [],
        path: [],
      },
      codeFilterCatalog: {
        language: ["julia", "javascript"],
        kind: ["function"],
        repo: ["sciml"],
        path: ["src/"],
      },
    });

    expect(sources).toHaveLength(1);
    const items = await sources[0]!.getItems({} as never);
    expect(items).toMatchInlineSnapshot(`
      [
        {
          "suggestionType": "filter",
          "text": "lang:julia",
        },
        {
          "suggestionType": "filter",
          "text": "lang:javascript",
        },
      ]
    `);
    expect(searchAutocompleteMock).not.toHaveBeenCalled();
  });

  it("strips code filters before backend autocomplete in all scope", async () => {
    searchAutocompleteMock.mockResolvedValue({
      prefix: "sec",
      suggestions: [
        {
          text: "section",
          suggestionType: "stem",
        },
      ],
    });

    const sources = buildSearchAutocompleteSources({
      scope: "all",
      rawQuery: "sec lang:j",
      parsedCodeFilters: {
        language: [],
        kind: [],
        repo: [],
        path: [],
      },
      codeFilterCatalog: {
        language: ["julia"],
        kind: ["function"],
        repo: ["sciml"],
        path: ["src/"],
      },
    });

    expect(sources).toHaveLength(2);
    const backendItems = await sources[1]!.getItems({} as never);
    expect(searchAutocompleteMock).toHaveBeenCalledWith("sec", 5);
    expect(backendItems).toMatchInlineSnapshot(`
      [
        {
          "suggestionType": "filter",
          "text": "sec lang:julia",
        },
        {
          "suggestionType": "stem",
          "text": "section",
        },
      ]
    `);
  });

  it("deduplicates repeated free-text tokens before backend autocomplete in all scope", async () => {
    searchAutocompleteMock.mockResolvedValue({
      prefix: "sec",
      suggestions: [
        {
          text: "section",
          suggestionType: "stem",
        },
      ],
    });

    const sources = buildSearchAutocompleteSources({
      scope: "all",
      rawQuery: "sec lang:j sec kind:f",
      parsedCodeFilters: {
        language: [],
        kind: [],
        repo: [],
        path: [],
      },
      codeFilterCatalog: {
        language: ["julia"],
        kind: ["function"],
        repo: ["sciml"],
        path: ["src/"],
      },
    });

    expect(sources).toHaveLength(2);
    await sources[1]!.getItems({} as never);
    expect(searchAutocompleteMock).toHaveBeenCalledWith("sec", 5);
  });
});
