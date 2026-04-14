import { describe, expect, it } from "vitest";
import {
  buildSearchOnlyRepoPlaceholderQuery,
  inferRepoFilterFromConfiguredFields,
  resolveRepoScopedBackendCodeSearchQuery,
} from "../repoProjectConfig";

describe("repoProjectConfig", () => {
  it("does not infer repo filters from frontend config anymore", () => {
    expect(inferRepoFilterFromConfiguredFields("lance")).toBeUndefined();
  });

  it("keeps placeholder AST analysis disabled for repo-seed-only queries", () => {
    expect(buildSearchOnlyRepoPlaceholderQuery("lance", "lance")).toBeNull();
    expect(resolveRepoScopedBackendCodeSearchQuery("lance", "lance")).toBeNull();
  });

  it("keeps explicit structural queries on backend code_search lane", () => {
    expect(resolveRepoScopedBackendCodeSearchQuery('lance ast:"$PATTERN" lang:rust', "lance")).toBe(
      'lance ast:"$PATTERN" lang:rust',
    );
  });

  it("does not force backend code_search for repo facets", () => {
    expect(resolveRepoScopedBackendCodeSearchQuery("lance", "lance", "module")).toBeNull();
  });
});
