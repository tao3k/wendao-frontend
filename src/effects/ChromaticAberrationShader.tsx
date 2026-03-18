/**
 * Chromatic Aberration Shader
 *
 * Custom post-processing effect for hyperspace transitions.
 * Provides an imperative ref for intensity and time updates.
 */

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Effect } from 'postprocessing';
import { Uniform } from 'three';

const fragmentShader = `
uniform float uIntensity;
uniform float uOffset;
uniform float uTime;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 centered = uv - 0.5;
  float dist = length(centered);

  float wave = sin(uTime * 2.0 + dist * 16.0) * 0.5 + 0.5;
  float radial = smoothstep(0.05, 0.8, dist);
  float intensity = uIntensity * mix(0.35, 1.0, wave) * radial;

  vec2 offset = centered * uOffset * intensity;
  vec2 uvR = clamp(uv + offset, 0.0, 1.0);
  vec2 uvB = clamp(uv - offset, 0.0, 1.0);

  float r = texture2D(inputBuffer, uvR).r;
  float g = texture2D(inputBuffer, uv).g;
  float b = texture2D(inputBuffer, uvB).b;

  outputColor = vec4(r, g, b, inputColor.a);
}
`;

export interface ChromaticAberrationShaderProps {
  intensity?: number;
  offset?: number;
  time?: number;
}

export interface ChromaticAberrationShaderRef {
  intensity: number;
  offset: number;
  time: number;
}

export class ChromaticAberrationEffect extends Effect {
  constructor({ intensity = 0, offset = 0.003, time = 0 }: ChromaticAberrationShaderProps = {}) {
    super('ChromaticAberrationEffect', fragmentShader, {
      uniforms: new Map([
        ['uIntensity', new Uniform(intensity)],
        ['uOffset', new Uniform(offset)],
        ['uTime', new Uniform(time)],
      ]),
    });
  }

  get intensity() {
    return this.uniforms.get('uIntensity')?.value ?? 0;
  }

  set intensity(value: number) {
    const uniform = this.uniforms.get('uIntensity');
    if (uniform) {
      uniform.value = value;
    }
  }

  get offset() {
    return this.uniforms.get('uOffset')?.value ?? 0;
  }

  set offset(value: number) {
    const uniform = this.uniforms.get('uOffset');
    if (uniform) {
      uniform.value = value;
    }
  }

  get time() {
    return this.uniforms.get('uTime')?.value ?? 0;
  }

  set time(value: number) {
    const uniform = this.uniforms.get('uTime');
    if (uniform) {
      uniform.value = value;
    }
  }
}

export const ChromaticAberrationShader = forwardRef<
  ChromaticAberrationShaderRef,
  ChromaticAberrationShaderProps
>(({ intensity = 0, offset = 0.003, time = 0 }, ref) => {
  const effectRef = useRef<ChromaticAberrationEffect | null>(null);
  const effect = useMemo(
    () => new ChromaticAberrationEffect({ intensity, offset, time }),
    [intensity, offset, time]
  );

  useEffect(() => {
    if (!effectRef.current) return;

    effectRef.current.intensity = intensity;
    effectRef.current.offset = offset;
    effectRef.current.time = time;
  }, [intensity, offset, time]);

  useImperativeHandle(
    ref,
    () =>
      ({
        get intensity() {
          return effectRef.current?.intensity ?? 0;
        },
        set intensity(value: number) {
          if (effectRef.current) {
            effectRef.current.intensity = value;
          }
        },
        get offset() {
          return effectRef.current?.offset ?? 0;
        },
        set offset(value: number) {
          if (effectRef.current) {
            effectRef.current.offset = value;
          }
        },
        get time() {
          return effectRef.current?.time ?? 0;
        },
        set time(value: number) {
          if (effectRef.current) {
            effectRef.current.time = value;
          }
        },
      }) as ChromaticAberrationShaderRef,
    []
  );

  return <primitive object={effect} ref={effectRef} />;
});

ChromaticAberrationShader.displayName = 'ChromaticAberrationShader';

export default ChromaticAberrationShader;
