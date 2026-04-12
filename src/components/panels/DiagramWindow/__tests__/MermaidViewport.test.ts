import { describe, expect, it } from "vitest";
import { applyMermaidNodeGlyphScale } from "../MermaidViewport";

describe("MermaidViewport node glyph scaling", () => {
  it("scales mermaid node groups around their visual center", () => {
    const document = new DOMParser().parseFromString(
      '<svg viewBox="0 0 160 120"><g class="node"><rect x="10" y="20" width="60" height="40" /></g></svg>',
      "image/svg+xml",
    );
    const svg = document.querySelector("svg") as SVGSVGElement;
    const nodeGroup = svg.querySelector("g.node") as SVGGElement;

    Object.defineProperty(nodeGroup, "getBBox", {
      configurable: true,
      value: () =>
        ({
          x: 10,
          y: 20,
          width: 60,
          height: 40,
        }) as DOMRect,
    });

    applyMermaidNodeGlyphScale(svg, 1.22);

    expect(nodeGroup.getAttribute("transform")).toBe(
      "translate(40 40) scale(1.22) translate(-40 -40)",
    );
    expect(nodeGroup.getAttribute("data-mermaid-node-glyph-scale")).toBe("1.22");
  });

  it("restores the base transform when glyph scaling is disabled", () => {
    const document = new DOMParser().parseFromString(
      '<svg viewBox="0 0 160 120"><g class="node" transform="translate(4 8)"><rect x="10" y="20" width="60" height="40" /></g></svg>',
      "image/svg+xml",
    );
    const svg = document.querySelector("svg") as SVGSVGElement;
    const nodeGroup = svg.querySelector("g.node") as SVGGElement;

    Object.defineProperty(nodeGroup, "getBBox", {
      configurable: true,
      value: () =>
        ({
          x: 10,
          y: 20,
          width: 60,
          height: 40,
        }) as DOMRect,
    });

    applyMermaidNodeGlyphScale(svg, 1.08);
    applyMermaidNodeGlyphScale(svg, 1);

    expect(nodeGroup.getAttribute("transform")).toBe("translate(4 8)");
    expect(nodeGroup.hasAttribute("data-mermaid-node-glyph-scale")).toBe(false);
  });
});
