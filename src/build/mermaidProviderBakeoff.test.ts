import { describe, expect, it } from "vitest";

import {
  loadMermaidRuntimeProviderByName,
  MERMAID_BAKEOFF_FIXTURES,
} from "../components/panels/mermaidRuntime";

const BAKEOFF_THEME = {
  bg: "#000000",
  fg: "#ffffff",
  accent: "#33ccff",
  transparent: false,
} as const;

function runFixture(
  source: string,
  renderMermaid: (source: string, theme: typeof BAKEOFF_THEME) => string,
): "pass" | "fail" {
  try {
    const svg = renderMermaid(source, BAKEOFF_THEME);
    return svg.includes("<svg") ? "pass" : "fail";
  } catch {
    return "fail";
  }
}

describe("Mermaid provider bakeoff corpus", () => {
  it("keeps beautiful-mermaid green on the bounded corpus", async () => {
    const provider = await loadMermaidRuntimeProviderByName("beautiful-mermaid");

    const outcomes = MERMAID_BAKEOFF_FIXTURES.map((fixture) => ({
      id: fixture.id,
      outcome: runFixture(fixture.source, provider.renderMermaid),
    }));

    expect(outcomes).toEqual(
      MERMAID_BAKEOFF_FIXTURES.map((fixture) => ({
        id: fixture.id,
        outcome: "pass",
      })),
    );
  });

  it("pins the compact-flow spike to its intentionally narrow coverage boundary", async () => {
    const provider = await loadMermaidRuntimeProviderByName("compact-flow");

    const outcomes = MERMAID_BAKEOFF_FIXTURES.map((fixture) => ({
      id: fixture.id,
      outcome: runFixture(fixture.source, provider.renderMermaid),
    }));

    expect(outcomes).toEqual(
      MERMAID_BAKEOFF_FIXTURES.map((fixture) => ({
        id: fixture.id,
        outcome: fixture.expectedCompactFlow,
      })),
    );
  });
});
