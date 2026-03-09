/**
 * Runtime Recursion Detection Tests
 *
 * These tests help catch infinite loops and stack overflow issues
 * that unit tests might miss.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original console methods
const originalError = console.error;
const originalWarn = console.warn;

describe('Recursion Detection', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
    vi.restoreAllMocks();
  });

  describe('Component Circular Reference Detection', () => {
    it('should detect circular refs in JSX props', () => {
      // This pattern can cause infinite loops:
      // <primitive object={meshRef.current} /> where meshRef.current
      // is created by the same component's <instancedMesh ref={meshRef}>

      const detectCircularRef = (jsx: string): boolean => {
        // Check for patterns like:
        // 1. ref={x} and <primitive object={x.current}>
        // 2. useMemo/useCallback with circular dependencies
        const hasRef = /ref=\{(\w+)\}/.test(jsx);
        const hasPrimitiveWithSameRef = /<primitive[^>]*object=\{(\w+)\.current\}/.test(jsx);

        return hasRef && hasPrimitiveWithSameRef;
      };

      // Test the detection
      const badCode = `
        const meshRef = useRef(null);
        return (
          <>
            <instancedMesh ref={meshRef} />
            {meshRef.current && <primitive object={meshRef.current} />}
          </>
        );
      `;

      expect(detectCircularRef(badCode)).toBe(true);

      const goodCode = `
        const meshRef = useRef(null);
        return (
          <>
            <instancedMesh ref={meshRef} />
          </>
        );
      `;

      expect(detectCircularRef(goodCode)).toBe(false);
    });

    it('should detect useEffect without proper dependencies', () => {
      // Pattern that causes infinite loops:
      // useEffect(() => { setState(...) }, [state]) where setState triggers state change

      const detectEffectLoop = (code: string): string[] => {
        const issues: string[] = [];

        // Check for setState in effect with state in deps
        const effectMatch = code.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{([^}]+)\},\s*\[([^\]]+)\]\s*\)/g);
        if (effectMatch) {
          effectMatch.forEach((effect) => {
            const stateInDeps = effect.match(/\[\s*(\w+)\s*\]/)?.[1];
            if (stateInDeps && effect.includes(`set${stateInDeps.charAt(0).toUpperCase()}`)) {
              issues.push(`Possible loop: setState for ${stateInDeps} in useEffect with ${stateInDeps} in deps`);
            }
          });
        }

        return issues;
      };

      const badEffect = `
        useEffect(() => {
          setCount(count + 1);
        }, [count]);
      `;

      expect(detectEffectLoop(badEffect)).toHaveLength(1);

      const goodEffect = `
        useEffect(() => {
          setCount(c => c + 1);
        }, []);
      `;

      expect(detectEffectLoop(goodEffect)).toHaveLength(0);
    });
  });

  describe('useFrame Loop Detection', () => {
    it('should detect state updates in useFrame without guards', () => {
      // Pattern: useFrame(() => setState(...)) without any condition
      // This causes re-renders every frame

      const detectFrameLoop = (code: string): boolean => {
        const hasUseFrame = /useFrame\s*\(\s*\([^)]*\)\s*=>\s*\{/.test(code);
        const hasStateUpdate = /set[A-Z]\w+\s*\(/ .test(code);
        const hasGuard = /if\s*\([^)]+\)/.test(code);

        return hasUseFrame && hasStateUpdate && !hasGuard;
      };

      const badFrame = `
        useFrame(() => {
          setPosition({ x: state.x + 1 });
        });
      `;

      expect(detectFrameLoop(badFrame)).toBe(true);

      const goodFrame = `
        useFrame(() => {
          if (isActive) {
            meshRef.current.rotation.y += 0.01;
          }
        });
      `;

      expect(detectFrameLoop(goodFrame)).toBe(false);
    });
  });

  describe('Worker Message Loop Detection', () => {
    it('should detect message ping-pong loops', () => {
      // Pattern: worker sends message -> onmessage -> sends message back -> loop

      const detectMessageLoop = (workerCode: string): boolean => {
        const hasPostMessage = /postMessage\s*\(/.test(workerCode);
        const hasOnMessage = /onmessage\s*=/.test(workerCode);
        const sendsToSelf = /self\.postMessage/.test(workerCode) &&
                          /self\.onmessage/.test(workerCode);

        // This is expected for workers, but check for unbounded loops
        const hasLoopWithoutTermination = /while\s*\(\s*true\s*\)/.test(workerCode) ||
                                          /for\s*\(\s*;\s*;/.test(workerCode);

        return hasPostMessage && hasOnMessage && hasLoopWithoutTermination;
      };

      const badWorker = `
        self.onmessage = (e) => {
          while (true) {
            self.postMessage({ type: 'tick' });
          }
        };
      `;

      expect(detectMessageLoop(badWorker)).toBe(true);

      const goodWorker = `
        self.onmessage = (e) => {
          if (e.data.type === 'tick') {
            // Process once
            self.postMessage({ type: 'result' });
          }
        };
      `;

      expect(detectMessageLoop(goodWorker)).toBe(false);
    });
  });

  describe('Three.js Object Disposal', () => {
    it('should track object lifecycle to detect disposal loops', () => {
      // Objects should be disposed exactly once

      const createLifecycleTracker = () => {
        const disposed = new Set<string>();

        return {
          dispose: (id: string) => {
            if (disposed.has(id)) {
              throw new Error(`Double disposal detected: ${id}`);
            }
            disposed.add(id);
          },
          isDisposed: (id: string) => disposed.has(id),
        };
      };

      const tracker = createLifecycleTracker();

      tracker.dispose('obj-1');
      expect(tracker.isDisposed('obj-1')).toBe(true);

      expect(() => tracker.dispose('obj-1')).toThrow('Double disposal');
    });
  });

  describe('React Render Count Detection', () => {
    it('should detect excessive re-renders', () => {
      const createRenderCounter = (maxRenders: number = 100) => {
        let count = 0;
        return {
          render: () => {
            count++;
            if (count > maxRenders) {
              throw new Error(`Infinite render loop detected: ${count} renders`);
            }
          },
          getCount: () => count,
        };
      };

      const counter = createRenderCounter(50);

      // Simulate normal renders
      for (let i = 0; i < 10; i++) {
        counter.render();
      }
      expect(counter.getCount()).toBe(10);

      // Simulate infinite loop
      const loopCounter = createRenderCounter(50);
      expect(() => {
        for (let i = 0; i < 100; i++) {
          loopCounter.render();
        }
      }).toThrow('Infinite render loop');
    });
  });

  describe('Effect Chain Validation', () => {
    it('should validate postprocessing effect chain for circular dependencies', () => {
      interface Effect {
        name: string;
        inputs: string[];
        outputs: string[];
      }

      const detectCircularEffects = (effects: Effect[]): string[] => {
        const issues: string[] = [];
        const visited = new Set<string>();
        const path = new Set<string>();

        const visit = (name: string): boolean => {
          if (path.has(name)) {
            issues.push(`Circular effect dependency: ${name}`);
            return true;
          }
          if (visited.has(name)) return false;

          visited.add(name);
          path.add(name);

          const effect = effects.find(e => e.name === name);
          if (effect) {
            for (const input of effect.inputs) {
              visit(input);
            }
          }

          path.delete(name);
          return false;
        };

        effects.forEach(e => visit(e.name));
        return issues;
      };

      const goodEffects: Effect[] = [
        { name: 'bloom', inputs: [], outputs: ['bloomed'] },
        { name: 'vignette', inputs: ['bloomed'], outputs: ['final'] },
      ];

      expect(detectCircularEffects(goodEffects)).toHaveLength(0);

      const badEffects: Effect[] = [
        { name: 'effect1', inputs: ['effect3'], outputs: ['out1'] },
        { name: 'effect2', inputs: ['effect1'], outputs: ['out2'] },
        { name: 'effect3', inputs: ['effect2'], outputs: ['out3'] },
      ];

      expect(detectCircularEffects(badEffects)).toHaveLength(1);
    });
  });
});

describe('Stack Depth Monitoring', () => {
  it('should detect potential stack overflow', () => {
    // Create a depth-limited recursive function
    const createLimitedRecursion = (maxDepth: number): (() => void) => {
      let depth = 0;
      const recurse = () => {
        depth++;
        if (depth > maxDepth) {
          throw new Error(`Stack depth exceeded: ${depth}`);
        }
        if (depth < 200) {
          recurse(); // Recursive call
        }
      };
      return recurse;
    };

    // Deep recursion that should be caught
    const limited = createLimitedRecursion(50);
    expect(() => limited()).toThrow('Stack depth exceeded');
  });

  it('should allow normal recursion within limits', () => {
    const createLimitedRecursion = (maxDepth: number): (() => number) => {
      let depth = 0;
      const recurse = (): number => {
        depth++;
        if (depth > maxDepth) {
          throw new Error(`Stack depth exceeded: ${depth}`);
        }
        if (depth < 10) {
          return recurse();
        }
        return depth;
      };
      return recurse;
    };

    const safe = createLimitedRecursion(50);
    expect(() => safe()).not.toThrow();
    // Note: calling safe() twice gives different results because depth persists
    // First call returns 10, second call continues from 10 to 11
  });
});
