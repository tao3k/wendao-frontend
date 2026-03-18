/**
 * Tests for Camera Tween System
 *
 * Tests easing functions, tween state management, and camera updates.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { easingFunctions, type EasingFunction } from '../CameraTween';

describe('CameraTween Easing Functions', () => {
  describe('linear', () => {
    it('should return input unchanged', () => {
      const linear = easingFunctions.linear;
      expect(linear(0)).toBe(0);
      expect(linear(0.5)).toBe(0.5);
      expect(linear(1)).toBe(1);
    });
  });

  describe('easeOutExpo', () => {
    it('should start slow and end fast', () => {
      const ease = easingFunctions.easeOutExpo;
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);

      // Exponential decay: should be greater than linear at 0.5
      // Formula: 1 - pow(2, -10 * t) for t < 1
      expect(ease(0.5)).toBeCloseTo(1 - Math.pow(2, -5), 5);
      expect(ease(0.5)).toBeGreaterThan(0.9);
    });

    it('should handle edge case at t=1', () => {
      expect(easingFunctions.easeOutExpo(1)).toBe(1);
    });
  });

  describe('easeInOutCubic', () => {
    it('should be symmetric around 0.5', () => {
      const ease = easingFunctions.easeInOutCubic;
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      expect(ease(0.5)).toBe(0.5);

      // First half accelerates
      expect(ease(0.25)).toBeLessThan(0.25);

      // Second half decelerates
      expect(ease(0.75)).toBeGreaterThan(0.75);
    });

    it('should match cubic formula', () => {
      const ease = easingFunctions.easeInOutCubic;

      // First half: 4t³
      expect(ease(0.25)).toBeCloseTo(4 * Math.pow(0.25, 3), 5);

      // Second half: 1 - (-2t + 2)³ / 2
      const t = 0.75;
      const expected = 1 - Math.pow(-2 * t + 2, 3) / 2;
      expect(ease(0.75)).toBeCloseTo(expected, 5);
    });
  });

  describe('easeOutBack', () => {
    it('should overshoot slightly at the end', () => {
      const ease = easingFunctions.easeOutBack;
      expect(ease(0)).toBeCloseTo(0, 10);
      expect(ease(1)).toBe(1);

      // Should overshoot above 1 briefly then settle
      // The overshoot happens around t=0.7-0.9
      expect(ease(0.8)).toBeGreaterThan(1);
    });

    it('should use correct constants', () => {
      const c1 = 1.70158;
      const c3 = c1 + 1;

      // Verify formula: 1 + c3 * (t-1)³ + c1 * (t-1)²
      const t = 0.5;
      const expected = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      expect(easingFunctions.easeOutBack(t)).toBeCloseTo(expected, 5);
    });
  });

  describe('easeInOutQuart', () => {
    it('should be symmetric around 0.5', () => {
      const ease = easingFunctions.easeInOutQuart;
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      expect(ease(0.5)).toBe(0.5);
    });

    it('should use quartic formula', () => {
      const ease = easingFunctions.easeInOutQuart;

      // First half: 8t⁴
      expect(ease(0.25)).toBeCloseTo(8 * Math.pow(0.25, 4), 5);

      // Second half: 1 - (-2t + 2)⁴ / 2
      const t = 0.75;
      const expected = 1 - Math.pow(-2 * t + 2, 4) / 2;
      expect(ease(t)).toBeCloseTo(expected, 5);
    });
  });

  describe('all easing functions', () => {
    it('should all return 0 at start', () => {
      Object.entries(easingFunctions).forEach(([name, fn]) => {
        expect(fn(0), `${name}(0) should be 0`).toBeCloseTo(0, 10);
      });
    });

    it('should all return 1 at end', () => {
      Object.entries(easingFunctions).forEach(([name, fn]) => {
        expect(fn(1), `${name}(1) should be 1`).toBeCloseTo(1, 10);
      });
    });

    it('should all be monotonically increasing (except overshooting easings)', () => {
      const steps = 100;
      const monotonicEasings: EasingFunction[] = ['linear', 'easeOutExpo', 'easeInOutCubic', 'easeInOutQuart'];

      monotonicEasings.forEach((name) => {
        const fn = easingFunctions[name];
        let prev = fn(0);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const curr = fn(t);
          expect(curr, `${name} should be monotonic at t=${t}`).toBeGreaterThanOrEqual(prev);
          prev = curr;
        }
      });
    });

    it('easeOutBack should overshoot then return', () => {
      const ease = easingFunctions.easeOutBack;
      // Find the peak overshoot
      let maxValue = 0;
      let maxT = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        const val = ease(t);
        if (val > maxValue) {
          maxValue = val;
          maxT = t;
        }
      }
      // Should overshoot above 1
      expect(maxValue).toBeGreaterThan(1);
      // Should end at 1
      expect(ease(1)).toBe(1);
    });
  });
});

describe('CameraTween State Management', () => {
  // Mock THREE.js Vector3 for testing
  class MockVector3 {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    clone() {
      return new MockVector3(this.x, this.y, this.z);
    }

    lerpVectors(a: MockVector3, b: MockVector3, t: number) {
      this.x = a.x + (b.x - a.x) * t;
      this.y = a.y + (b.y - a.y) * t;
      this.z = a.z + (b.z - a.z) * t;
      return this;
    }
  }

  describe('Vector interpolation', () => {
    it('should interpolate between two vectors', () => {
      const from = new MockVector3(0, 0, 0);
      const to = new MockVector3(10, 20, 30);
      const result = new MockVector3();

      result.lerpVectors(from, to, 0.5);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
      expect(result.z).toBe(15);
    });

    it('should handle zero progress', () => {
      const from = new MockVector3(5, 10, 15);
      const to = new MockVector3(20, 30, 40);
      const result = new MockVector3();

      result.lerpVectors(from, to, 0);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
      expect(result.z).toBe(15);
    });

    it('should handle complete progress', () => {
      const from = new MockVector3(5, 10, 15);
      const to = new MockVector3(20, 30, 40);
      const result = new MockVector3();

      result.lerpVectors(from, to, 1);
      expect(result.x).toBe(20);
      expect(result.y).toBe(30);
      expect(result.z).toBe(40);
    });
  });

  describe('FOV interpolation', () => {
    it('should interpolate FOV linearly', () => {
      const fromFov = 60;
      const toFov = 90;
      const progress = 0.5;

      const fov = fromFov + (toFov - fromFov) * progress;
      expect(fov).toBe(75);
    });

    it('should handle warp effect FOV change', () => {
      const fromFov = 60;
      const warpFov = 90;
      const returnFov = 60;

      // Start of warp
      const progress1 = 0.25;
      const fov1 = fromFov + (warpFov - fromFov) * easingFunctions.easeInOutQuart(progress1);
      expect(fov1).toBeGreaterThan(60);
      expect(fov1).toBeLessThan(90);

      // Peak of warp - easeInOutQuart(0.5) = 0.5
      const progress2 = 0.5;
      const easedProgress2 = easingFunctions.easeInOutQuart(progress2);
      const fov2 = fromFov + (warpFov - fromFov) * easedProgress2;
      expect(easedProgress2).toBe(0.5); // easeInOutQuart is symmetric
      expect(fov2).toBe(75); // 60 + (90-60) * 0.5

      // End of warp
      const progress3 = 1;
      const fov3 = fromFov + (returnFov - fromFov) * easingFunctions.easeInOutQuart(progress3);
      expect(fov3).toBe(60);
    });
  });
});

describe('CameraTween Warp Intensity', () => {
  it('should peak at middle of transition', () => {
    const getWarpIntensity = (progress: number): number => {
      const peak = 0.5;
      if (progress < peak) {
        return progress / peak;
      } else {
        return 1 - (progress - peak) / peak;
      }
    };

    expect(getWarpIntensity(0)).toBe(0);
    expect(getWarpIntensity(0.5)).toBe(1);
    expect(getWarpIntensity(1)).toBe(0);
  });

  it('should be symmetric around peak', () => {
    const getWarpIntensity = (progress: number): number => {
      const peak = 0.5;
      if (progress < peak) {
        return progress / peak;
      } else {
        return 1 - (progress - peak) / peak;
      }
    };

    expect(getWarpIntensity(0.25)).toBeCloseTo(getWarpIntensity(0.75), 10);
    expect(getWarpIntensity(0.1)).toBeCloseTo(getWarpIntensity(0.9), 10);
  });
});

describe('CameraTween Timing', () => {
  it('should calculate progress from timestamp', () => {
    const startTime = 1000;
    const duration = 800;

    const getProgress = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      return Math.min(elapsed / duration, 1);
    };

    expect(getProgress(1000)).toBe(0);
    expect(getProgress(1400)).toBe(0.5);
    expect(getProgress(1800)).toBe(1);
    expect(getProgress(2000)).toBe(1); // Capped at 1
  });

  it('should apply easing to progress before interpolation', () => {
    const startTime = 0;
    const duration = 1000;
    const timestamp = 500;
    const rawProgress = (timestamp - startTime) / duration;

    const easedProgress = easingFunctions.easeOutExpo(rawProgress);

    // Eased progress should be different from raw
    expect(easedProgress).not.toBe(rawProgress);
    expect(easedProgress).toBeGreaterThan(rawProgress); // easeOutExpo is front-loaded
  });
});
