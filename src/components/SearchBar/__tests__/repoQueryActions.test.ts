import { describe, expect, it } from "vitest";
import { buildApplyRepoFacetQuery, buildRestoreRepoFallbackQuery } from "../repoQueryActions";

describe("repoQueryActions", () => {
  it("builds facet query from primary repo filter", () => {
    expect(
      buildApplyRepoFacetQuery({
        facet: "module",
        primaryRepoFilter: "gateway-sync",
        repoOverviewRepoId: "fallback-repo",
      }),
    ).toBe("repo:gateway-sync kind:module module");
  });

  it("falls back to repo overview repo id for facet query", () => {
    expect(
      buildApplyRepoFacetQuery({
        facet: "doc",
        primaryRepoFilter: "",
        repoOverviewRepoId: "gateway-sync",
      }),
    ).toBe("repo:gateway-sync kind:doc docs");
  });

  it("builds restore query using active repo filter first", () => {
    expect(
      buildRestoreRepoFallbackQuery({
        activeRepoFilter: "active-repo",
        primaryRepoFilter: "primary-repo",
        repoOverviewRepoId: "overview-repo",
        fallbackFacet: "symbol",
        fallbackFromQuery: "GatewaySyncPkg",
      }),
    ).toBe("repo:active-repo kind:function GatewaySyncPkg");
  });

  it("returns empty restore query when original query is missing", () => {
    expect(
      buildRestoreRepoFallbackQuery({
        activeRepoFilter: "active-repo",
        primaryRepoFilter: "primary-repo",
        repoOverviewRepoId: "overview-repo",
        fallbackFacet: "module",
        fallbackFromQuery: "",
      }),
    ).toBe("");
  });
});
