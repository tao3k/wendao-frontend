import { describe, expect, it } from "vitest";

import type { UiSearchContract } from "../../../api/bindings";
import { validateSearchContract } from "../searchContract";

const searchContractFixture: UiSearchContract = {
  contractVersion: "1",
  codeSearch: {
    queryGrammarVersion: "repo_code_query.v1",
    intent: "code_search",
    backendPrefixes: ["lang", "kind", "repo"],
    composedPrefixes: ["path"],
    prefixAliases: [{ alias: "language", canonical: "lang" }],
    structuralPrefixes: ["ast", "sg"],
    backendKindFilters: ["file", "symbol", "function", "module", "example"],
    routes: {
      knowledge: "/search/knowledge",
      intent: "/search/intent",
      autocomplete: "/search/autocomplete",
    },
    examples: [
      {
        id: "dedupe_free_text",
        lane: "backend_code_search",
        query: "sec lang:julia sec kind:function",
        normalizedQuery: "sec lang:julia kind:function",
        baseQuery: "sec",
        languageFilters: ["julia"],
        kindFilters: ["function"],
        repoFilters: [],
        pathFilters: [],
      },
      {
        id: "structural_repo_query",
        lane: "backend_code_search",
        query: 'repo:lancd lang:rust ast:"fn $NAME($$$ARGS) { $$$BODY }"',
        normalizedQuery: 'repo:lancd lang:rust ast:"fn $NAME($$$ARGS) { $$$BODY }"',
        baseQuery: 'ast:"fn $NAME($$$ARGS) { $$$BODY }"',
        languageFilters: ["rust"],
        kindFilters: [],
        repoFilters: ["lancd"],
        pathFilters: [],
      },
      {
        id: "frontend_path_filter",
        lane: "frontend_composed_filter",
        query: "solver path:src/",
        normalizedQuery: "solver path:src/",
        baseQuery: "solver",
        languageFilters: [],
        kindFilters: [],
        repoFilters: [],
        pathFilters: ["src/"],
      },
    ],
  },
  repoDiscovery: {
    suggest: {
      source: "repo_index_status",
      defaultLimit: 6,
      queryScoped: false,
      exhaustive: true,
    },
    facet: {
      source: "search_results",
      defaultLimit: 6,
      queryScoped: true,
      exhaustive: false,
    },
    inventory: {
      source: "repo_index_status",
      defaultLimit: 200,
      queryScoped: false,
      exhaustive: true,
    },
  },
};

describe("searchContract", () => {
  it("accepts the Rust-owned studio search contract fixture", () => {
    expect(validateSearchContract(searchContractFixture)).toEqual([]);
  });

  it("reports drift when prefixes no longer match the frontend grammar", () => {
    const issues = validateSearchContract({
      ...searchContractFixture,
      codeSearch: {
        ...searchContractFixture.codeSearch,
        backendPrefixes: ["lang", "repo", "ast", "sg"],
      },
    });

    expect(issues).toContainEqual({
      field: "searchContract.codeSearch.prefixes",
      message:
        'expected ["lang","kind","repo","path","ast","sg"], received ["lang","repo","ast","sg","path","ast","sg"]',
    });
  });

  it("reports drift when repo-discovery semantics stop matching the Rust contract", () => {
    const issues = validateSearchContract({
      ...searchContractFixture,
      repoDiscovery: {
        ...searchContractFixture.repoDiscovery,
        facet: {
          ...searchContractFixture.repoDiscovery.facet,
          exhaustive: true,
        },
      },
    });

    expect(issues).toContainEqual({
      field: "searchContract.repoDiscovery",
      message:
        'expected {"suggest":{"source":"repo_index_status","defaultLimit":6,"queryScoped":false,"exhaustive":true},"facet":{"source":"search_results","defaultLimit":6,"queryScoped":true,"exhaustive":false},"inventory":{"source":"repo_index_status","defaultLimit":200,"queryScoped":false,"exhaustive":true}}, received {"suggest":{"source":"repo_index_status","defaultLimit":6,"queryScoped":false,"exhaustive":true},"facet":{"source":"search_results","defaultLimit":6,"queryScoped":true,"exhaustive":true},"inventory":{"source":"repo_index_status","defaultLimit":200,"queryScoped":false,"exhaustive":true}}',
    });
  });
});
