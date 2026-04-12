import { describe, expect, it } from "vitest";
import { normalizeMermaidSvgForViewport } from "../normalizeMermaidSvgForViewport";

describe("normalizeMermaidSvgForViewport", () => {
  it("strips responsive root sizing so the viewport owns diagram fit", () => {
    const normalized = normalizeMermaidSvgForViewport(
      '<svg class="mermaid" viewBox="0 0 320 180" width="100%" height="100%" style="max-width: 320px; width: 100%; background: transparent;"><g /></svg>',
    );

    const document = new DOMParser().parseFromString(normalized, "image/svg+xml");
    const svg = document.querySelector("svg");

    expect(svg?.getAttribute("width")).toBe("320");
    expect(svg?.getAttribute("height")).toBe("180");
    expect(svg?.getAttribute("style")).toBe("background: transparent");
    expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });
});
