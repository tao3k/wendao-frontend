import { describe, expect, it } from "vitest";
import {
  resolveFallbackQueryFromDisplayName,
  shouldUseRepoOverviewFallback,
} from "../repoFacetFallback";

describe("repoFacetFallback", () => {
  it("treats generic facet terms as fallback candidates", () => {
    expect(shouldUseRepoOverviewFallback("module", "module")).toBe(true);
    expect(shouldUseRepoOverviewFallback("symbol", "solve")).toBe(true);
    expect(shouldUseRepoOverviewFallback("example", "example")).toBe(true);
    expect(shouldUseRepoOverviewFallback("doc", "docs")).toBe(true);
  });

  it("does not use fallback for specific query terms", () => {
    expect(shouldUseRepoOverviewFallback("module", "GatewaySyncPkg")).toBe(false);
  });

  it("normalizes fallback display names", () => {
    expect(resolveFallbackQueryFromDisplayName("  GatewaySyncPkg  ")).toBe("GatewaySyncPkg");
    expect(resolveFallbackQueryFromDisplayName("   ")).toBeNull();
    expect(resolveFallbackQueryFromDisplayName(undefined)).toBeNull();
  });
});
