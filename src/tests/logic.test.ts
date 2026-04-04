import { describe, it, expect } from "vitest";
import { parseBiLinks, extractConfidence } from "../utils/biLinks";

describe("Sovereign Logic Utils", () => {
  it("should correctly parse bidirectional links", () => {
    const input = "Refer to [[Academic_Specs]] for more info.";
    const output = parseBiLinks(input);
    expect(output).toContain('class="bilink"');
    expect(output).toContain('data-anchor="Academic_Specs"');
  });

  it("should extract confidence scores from LLM text (case-insensitive)", () => {
    const texts = [
      "The score is OMEGA_CONFIDENCE: 0.85",
      "Final result omega_confidence : 0.72",
      "confidence: none",
    ];

    expect(extractConfidence(texts[0])).toBe(0.85);
    expect(extractConfidence(texts[1])).toBe(0.72);
    expect(extractConfidence(texts[2])).toBeNull();
  });
});
