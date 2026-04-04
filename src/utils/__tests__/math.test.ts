import { describe, it, expect } from "vitest";
import { clamp, inBounds } from "../math";

describe("math utilities", () => {
  describe("clamp", () => {
    it("should return value when within bounds", () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it("should return min when value is below min", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("should return max when value is above max", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("should handle equal min and max", () => {
      expect(clamp(5, 10, 10)).toBe(10);
    });

    it("should handle negative bounds", () => {
      expect(clamp(-15, -10, 0)).toBe(-10);
      expect(clamp(5, -10, 0)).toBe(0);
    });
  });

  describe("inBounds", () => {
    it("should return true when value is within bounds", () => {
      expect(inBounds(5, 0, 10)).toBe(true);
    });

    it("should return true when value equals min", () => {
      expect(inBounds(0, 0, 10)).toBe(true);
    });

    it("should return true when value equals max", () => {
      expect(inBounds(10, 0, 10)).toBe(true);
    });

    it("should return false when value is below min", () => {
      expect(inBounds(-1, 0, 10)).toBe(false);
    });

    it("should return false when value is above max", () => {
      expect(inBounds(11, 0, 10)).toBe(false);
    });
  });
});
