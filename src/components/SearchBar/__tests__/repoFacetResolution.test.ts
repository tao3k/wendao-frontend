import { describe, expect, it } from "vitest";
import { resolveRepoFacetFromFilters } from "../repoFacetResolution";

describe("repoFacetResolution", () => {
  it("resolves module facet from kind filters", () => {
    expect(
      resolveRepoFacetFromFilters({
        language: [],
        kind: ["module"],
        repo: [],
        path: [],
      }),
    ).toBe("module");
  });

  it("resolves doc facet from documentation-like kinds", () => {
    expect(
      resolveRepoFacetFromFilters({
        language: [],
        kind: ["doc"],
        repo: [],
        path: [],
      }),
    ).toBe("doc");
    expect(
      resolveRepoFacetFromFilters({
        language: [],
        kind: ["documentation"],
        repo: [],
        path: [],
      }),
    ).toBe("doc");
  });

  it("returns null when no facet kind is present", () => {
    expect(
      resolveRepoFacetFromFilters({
        language: ["julia"],
        kind: [],
        repo: ["gateway-sync"],
        path: [],
      }),
    ).toBeNull();
  });

  it("resolves doc facet from path filters", () => {
    expect(
      resolveRepoFacetFromFilters({
        language: [],
        kind: [],
        repo: ["gateway-sync"],
        path: ["docs"],
      }),
    ).toBe("doc");
    expect(
      resolveRepoFacetFromFilters({
        language: [],
        kind: [],
        repo: ["gateway-sync"],
        path: ["README.md"],
      }),
    ).toBe("doc");
  });
});
