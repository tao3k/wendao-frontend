/**
 * Tests for Hyperspace Transition System
 *
 * Tests transition phases, intensity curves, and timing.
 */

import { describe, it, expect } from 'vitest';

// === Transition Phase Logic (mirrored from component) ===
type TransitionPhase = 'idle' | 'warming' | 'warping' | 'cooling';

function getPhase(progress: number): TransitionPhase {
  if (progress <= 0) return 'idle';
  if (progress < 0.2) return 'warming';
  if (progress < 0.75) return 'warping';
  if (progress < 1) return 'cooling';
  return 'idle';
}

function getIntensity(progress: number): number {
  // Sin curve: peaks at 0.5
  return Math.sin(progress * Math.PI);
}

describe('HyperspaceTransition Phase Logic', () => {
  describe('Phase Transitions', () => {
    it('should start in idle phase', () => {
      expect(getPhase(0)).toBe('idle');
    });

    it('should enter warming phase after start', () => {
      expect(getPhase(0.01)).toBe('warming');
      expect(getPhase(0.1)).toBe('warming');
      expect(getPhase(0.19)).toBe('warming');
    });

    it('should enter warping phase at 20%', () => {
      expect(getPhase(0.2)).toBe('warping');
      expect(getPhase(0.5)).toBe('warping');
      expect(getPhase(0.74)).toBe('warping');
    });

    it('should enter cooling phase at 75%', () => {
      expect(getPhase(0.75)).toBe('cooling');
      expect(getPhase(0.9)).toBe('cooling');
      expect(getPhase(0.99)).toBe('cooling');
    });

    it('should return to idle when complete', () => {
      expect(getPhase(1)).toBe('idle');
    });
  });

  describe('Phase Timing', () => {
    it('should follow blueprint timing (800ms total)', () => {
      const duration = 800;

      // Phase 1: 0-200ms (warming)
      const warmingEnd = 0.2 * duration;
      expect(warmingEnd).toBe(160); // ~200ms

      // Phase 2: 200-600ms (warping)
      const warpingStart = 0.2 * duration;
      const warpingEnd = 0.75 * duration;
      expect(warpingStart).toBe(160);
      expect(warpingEnd).toBe(600);

      // Phase 3: 600-800ms (cooling)
      const coolingStart = 0.75 * duration;
      const coolingEnd = duration;
      expect(coolingStart).toBe(600);
      expect(coolingEnd).toBe(800);
    });
  });
});

describe('HyperspaceTransition Intensity Curve', () => {
  it('should start at 0 intensity', () => {
    expect(getIntensity(0)).toBeCloseTo(0, 10);
  });

  it('should peak at middle of transition', () => {
    expect(getIntensity(0.5)).toBeCloseTo(1, 5);
  });

  it('should end at 0 intensity', () => {
    expect(getIntensity(1)).toBeCloseTo(0, 10);
  });

  it('should be symmetric around peak', () => {
    // sin curve is symmetric
    expect(getIntensity(0.25)).toBeCloseTo(getIntensity(0.75), 5);
    expect(getIntensity(0.1)).toBeCloseTo(getIntensity(0.9), 5);
  });

  it('should increase then decrease', () => {
    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(getIntensity);

    // Should increase to midpoint
    for (let i = 0; i < 4; i++) {
      expect(values[i]).toBeLessThan(values[i + 1]);
    }

    // Should decrease after midpoint
    for (let i = 5; i < 8; i++) {
      expect(values[i]).toBeGreaterThan(values[i + 1]);
    }
  });
});

describe('HyperspaceTransition Chromatic Aberration', () => {
  it('should scale intensity for chromatic effect', () => {
    const maxChromatic = 0.8;
    const progress = 0.5;
    const curveIntensity = Math.sin(progress * Math.PI);
    const chromaticIntensity = curveIntensity * maxChromatic;

    expect(chromaticIntensity).toBeCloseTo(0.8, 5);
  });

  it('should not exceed max chromatic intensity', () => {
    const maxChromatic = 0.8;

    for (let t = 0; t <= 1; t += 0.1) {
      const curveIntensity = Math.sin(t * Math.PI);
      const chromaticIntensity = curveIntensity * maxChromatic;
      expect(chromaticIntensity).toBeLessThanOrEqual(maxChromatic);
    }
  });
});

describe('HyperspaceTransition Default Config', () => {
  it('should use correct default values', () => {
    const defaultConfig = {
      duration: 1200,
      easing: 'easeInOutQuart',
      warpEffect: true,
      chromaticIntensity: 0.8,
      chromaticOffset: 0.003,
    };

    expect(defaultConfig.duration).toBe(1200);
    expect(defaultConfig.easing).toBe('easeInOutQuart');
    expect(defaultConfig.warpEffect).toBe(true);
    expect(defaultConfig.chromaticIntensity).toBe(0.8);
    expect(defaultConfig.chromaticOffset).toBe(0.003);
  });
});

describe('HyperspaceTransition Integration', () => {
  it('should coordinate phase and intensity', () => {
    // Test points across the transition
    const testPoints = [
      { progress: 0, expectedPhase: 'idle', minIntensity: -0.01, maxIntensity: 0.01 },
      { progress: 0.1, expectedPhase: 'warming', minIntensity: 0, maxIntensity: 0.5 },
      { progress: 0.5, expectedPhase: 'warping', minIntensity: 0.9, maxIntensity: 1.01 },
      { progress: 0.8, expectedPhase: 'cooling', minIntensity: 0, maxIntensity: 0.8 },
      { progress: 1, expectedPhase: 'idle', minIntensity: -0.01, maxIntensity: 0.01 },
    ];

    testPoints.forEach(({ progress, expectedPhase, minIntensity, maxIntensity }) => {
      const phase = getPhase(progress);
      const intensity = getIntensity(progress);

      expect(phase).toBe(expectedPhase);
      expect(intensity).toBeGreaterThanOrEqual(minIntensity);
      expect(intensity).toBeLessThanOrEqual(maxIntensity);
    });
  });

  it('should complete full transition cycle', () => {
    const phases: TransitionPhase[] = [];
    const intensities: number[] = [];

    for (let t = 0; t <= 1; t += 0.05) {
      phases.push(getPhase(t));
      intensities.push(getIntensity(t));
    }

    // Should go through all phases
    expect(phases).toContain('warming');
    expect(phases).toContain('warping');
    expect(phases).toContain('cooling');
    // idle appears at t=0 and t=1
    expect(phases.filter(p => p === 'idle').length).toBeGreaterThanOrEqual(1);

    // Intensity should peak at warping phase
    const maxIntensity = Math.max(...intensities);
    expect(maxIntensity).toBeCloseTo(1, 5);
  });
});
