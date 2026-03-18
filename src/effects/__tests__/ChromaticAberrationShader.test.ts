import { describe, expect, it } from 'vitest';
import { ChromaticAberrationEffect } from '../ChromaticAberrationShader';

describe('ChromaticAberrationEffect', () => {
  it('initializes uniforms from constructor values', () => {
    const effect = new ChromaticAberrationEffect({
      intensity: 0.6,
      offset: 0.004,
      time: 1.5,
    });

    expect(effect.intensity).toBeCloseTo(0.6);
    expect(effect.offset).toBeCloseTo(0.004);
    expect(effect.time).toBeCloseTo(1.5);
  });

  it('updates uniforms via setters', () => {
    const effect = new ChromaticAberrationEffect();

    effect.intensity = 0.25;
    effect.offset = 0.005;
    effect.time = 2.3;

    expect(effect.intensity).toBeCloseTo(0.25);
    expect(effect.offset).toBeCloseTo(0.005);
    expect(effect.time).toBeCloseTo(2.3);
  });
});
