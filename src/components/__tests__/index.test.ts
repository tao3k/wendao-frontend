import { describe, expect, it } from "vitest";
import * as components from "../index";

describe("components barrel", () => {
  it("exports ZenSearch as the public search surface", () => {
    expect(components).toHaveProperty("ZenSearchWindow");
    expect(components).not.toHaveProperty("SearchBar");
  });
});
