import { afterEach, describe, expect, it, vi } from "vitest";

import * as apiModule from "../../../api";
import {
  buildSearchOnlyRepoPlaceholderQuery,
  resolveRepoScopedBackendCodeSearchQuery,
} from "../repoProjectConfig";

describe("repoProjectConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds placeholder AST analysis for search-only repo seed queries", () => {
    vi.spyOn(apiModule, "getUiConfigSync").mockReturnValue({
      projects: [],
      repoProjects: [
        {
          id: "lance",
          url: "https://github.com/lance-format/lance",
          plugins: ["ast-grep"],
        },
      ],
    });

    expect(buildSearchOnlyRepoPlaceholderQuery("lance", "lance")).toBe('ast:"$PATTERN"');
    expect(resolveRepoScopedBackendCodeSearchQuery("lance", "lance")).toBe('ast:"$PATTERN"');
  });

  it("keeps explicit structural queries on backend code_search lane", () => {
    vi.spyOn(apiModule, "getUiConfigSync").mockReturnValue({
      projects: [],
      repoProjects: [
        {
          id: "lance",
          url: "https://github.com/lance-format/lance",
          plugins: ["ast-grep"],
        },
      ],
    });

    expect(
      buildSearchOnlyRepoPlaceholderQuery('lance ast:"$PATTERN" lang:rust', "lance"),
    ).toBeNull();
    expect(resolveRepoScopedBackendCodeSearchQuery('lance ast:"$PATTERN" lang:rust', "lance")).toBe(
      'lance ast:"$PATTERN" lang:rust',
    );
  });

  it("does not force backend code_search for repo facets", () => {
    vi.spyOn(apiModule, "getUiConfigSync").mockReturnValue({
      projects: [],
      repoProjects: [
        {
          id: "lance",
          url: "https://github.com/lance-format/lance",
          plugins: ["ast-grep"],
        },
      ],
    });

    expect(resolveRepoScopedBackendCodeSearchQuery("lance", "lance", "module")).toBeNull();
  });
});
