/**
 * Tests for camera tween utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Easing,
  tweenCamera,
  focusOnNode,
  focusOnCluster,
  resetCamera,
  isTweening,
  cancelAllTweens,
  prefersReducedMotion,
  getDefaultDuration,
} from './tweenCamera';

// Mock requestAnimationFrame
const mockRAF = vi.fn((cb: FrameRequestCallback) => {
  return setTimeout(() => cb(performance.now()), 16) as unknown as number;
});
const mockCancelRAF = vi.fn((id: number) => clearTimeout(id));

vi.stubGlobal('requestAnimationFrame', mockRAF);
vi.stubGlobal('cancelAnimationFrame', mockCancelRAF);

// Mock performance.now
let mockTime = 0;
vi.stubGlobal('performance', {
  now: () => mockTime,
});

// Mock matchMedia
const mockMatchMedia = vi.fn();
vi.stubGlobal('matchMedia', mockMatchMedia);

// Create a mock camera
function createMockCamera() {
  const camera = {
    position: { x: 0, y: 0, z: 0, set: vi.fn((x, y, z) => {
      camera.position.x = x;
      camera.position.y = y;
      camera.position.z = z;
    }) },
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn(),
    zoom: 1,
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
  };
  return camera as unknown as Parameters<typeof tweenCamera>[0];
}

// Helper to simulate animation frames
function simulateAnimation(duration: number, frameStep: number = 16) {
  let currentTime = 0;
  let callIndex = 0;

  // Simulate frames until completion or max iterations
  const maxIterations = 100;
  let iteration = 0;

  while (iteration < maxIterations) {
    mockTime = currentTime;

    // Get the latest callback that was scheduled
    if (callIndex >= mockRAF.mock.calls.length) break;
    const callback = mockRAF.mock.calls[callIndex][0];
    if (!callback) break;

    callback(currentTime);
    callIndex++;

    currentTime += frameStep;
    iteration++;

    // Stop if animation completed (no more callbacks scheduled)
    if (callIndex >= mockRAF.mock.calls.length && currentTime > duration) break;
  }
}

describe('Easing functions', () => {
  describe('linear', () => {
    it('should return input unchanged', () => {
      expect(Easing.linear(0)).toBe(0);
      expect(Easing.linear(0.5)).toBe(0.5);
      expect(Easing.linear(1)).toBe(1);
    });
  });

  describe('easeIn', () => {
    it('should accelerate from 0', () => {
      expect(Easing.easeIn(0)).toBe(0);
      expect(Easing.easeIn(0.5)).toBe(0.25);
      expect(Easing.easeIn(1)).toBe(1);
    });
  });

  describe('easeOut', () => {
    it('should decelerate to 1', () => {
      expect(Easing.easeOut(0)).toBe(0);
      expect(Easing.easeOut(0.5)).toBe(0.75);
      expect(Easing.easeOut(1)).toBe(1);
    });
  });

  describe('easeInOut', () => {
    it('should be symmetric around 0.5', () => {
      expect(Easing.easeInOut(0)).toBe(0);
      expect(Easing.easeInOut(0.25)).toBeCloseTo(0.125);
      expect(Easing.easeInOut(0.5)).toBe(0.5);
      expect(Easing.easeInOut(0.75)).toBeCloseTo(0.875);
      expect(Easing.easeInOut(1)).toBe(1);
    });
  });

  describe('easeOutCubic', () => {
    it('should start fast and slow down', () => {
      expect(Easing.easeOutCubic(0)).toBe(0);
      expect(Easing.easeOutCubic(0.5)).toBeCloseTo(0.875);
      expect(Easing.easeOutCubic(1)).toBe(1);
    });
  });

  describe('easeOutElastic', () => {
    it('should overshoot slightly', () => {
      expect(Easing.easeOutElastic(0)).toBe(0);
      expect(Easing.easeOutElastic(1)).toBe(1);
      // Should overshoot slightly in the middle
      expect(Easing.easeOutElastic(0.5)).toBeGreaterThan(1);
    });
  });
});

describe('prefersReducedMotion', () => {
  it('should return false when matchMedia returns false', () => {
    mockMatchMedia.mockReturnValue({ matches: false });
    expect(prefersReducedMotion()).toBe(false);
  });

  it('should return true when matchMedia returns true', () => {
    mockMatchMedia.mockReturnValue({ matches: true });
    expect(prefersReducedMotion()).toBe(true);
  });

  it('should return false when window is undefined', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing undefined window
    delete globalThis.window;
    expect(prefersReducedMotion()).toBe(false);
    globalThis.window = originalWindow;
  });
});

describe('getDefaultDuration', () => {
  it('should return 500 when motion is not reduced', () => {
    mockMatchMedia.mockReturnValue({ matches: false });
    expect(getDefaultDuration()).toBe(500);
  });

  it('should return 0 when motion is reduced', () => {
    mockMatchMedia.mockReturnValue({ matches: true });
    expect(getDefaultDuration()).toBe(0);
  });
});

describe('tweenCamera', () => {
  let camera: ReturnType<typeof createMockCamera>;

  beforeEach(() => {
    camera = createMockCamera();
    mockTime = 0;
    mockRAF.mockClear();
    mockCancelRAF.mockClear();
    mockMatchMedia.mockReturnValue({ matches: false });
  });

  afterEach(() => {
    cancelAllTweens();
  });

  it('should immediately set position when duration is 0', () => {
    const onComplete = vi.fn();
    mockMatchMedia.mockReturnValue({ matches: true }); // reduced motion

    tweenCamera(
      camera,
      { position: [10, 20, 30] },
      { duration: 500, onComplete }
    );

    expect(camera.position.set).toHaveBeenCalledWith(10, 20, 30);
    expect(onComplete).toHaveBeenCalled();
    expect(mockRAF).not.toHaveBeenCalled();
  });

  it('should start animation when duration > 0', () => {
    tweenCamera(
      camera,
      { position: [10, 20, 30] },
      { duration: 500 }
    );

    expect(mockRAF).toHaveBeenCalled();
  });

  it('should call onUpdate with progress', async () => {
    const onUpdate = vi.fn();
    const onComplete = vi.fn();

    tweenCamera(
      camera,
      { position: [100, 0, 0] },
      { duration: 100, onUpdate, onComplete }
    );

    // Simulate time passing
    mockTime = 50;
    mockRAF.mock.calls[0][0](mockTime);

    expect(onUpdate).toHaveBeenCalled();
    const progress = onUpdate.mock.calls[0][0];
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
  });

  it('should call onComplete when finished', async () => {
    const onComplete = vi.fn();

    tweenCamera(
      camera,
      { position: [100, 0, 0] },
      { duration: 100, onComplete }
    );

    // Simulate completion
    mockTime = 200;
    mockRAF.mock.calls[0][0](mockTime);

    expect(onComplete).toHaveBeenCalled();
  });

  it('should return cancel function', () => {
    const cancel = tweenCamera(
      camera,
      { position: [10, 20, 30] },
      { duration: 500 }
    );

    expect(typeof cancel).toBe('function');
    cancel();
    expect(mockCancelRAF).toHaveBeenCalled();
  });

  it('should cancel previous tween on new tween', () => {
    const onStop = vi.fn();

    tweenCamera(
      camera,
      { position: [10, 0, 0] },
      { duration: 500, onStop }
    );

    tweenCamera(
      camera,
      { position: [20, 0, 0] },
      { duration: 500 }
    );

    expect(onStop).toHaveBeenCalled();
  });

  it('should use custom easing function', () => {
    const customEasing = vi.fn((t) => t);

    tweenCamera(
      camera,
      { position: [10, 20, 30] },
      { duration: 100, easing: customEasing }
    );

    mockTime = 50;
    mockRAF.mock.calls[0][0](mockTime);

    expect(customEasing).toHaveBeenCalled();
  });

  it('should use named easing function', () => {
    tweenCamera(
      camera,
      { position: [10, 20, 30] },
      { duration: 100, easing: 'easeOutCubic' }
    );

    mockTime = 50;
    // Should not throw
    expect(() => mockRAF.mock.calls[0][0](mockTime)).not.toThrow();
  });
});

describe('focusOnNode', () => {
  let camera: ReturnType<typeof createMockCamera>;

  beforeEach(() => {
    camera = createMockCamera();
    mockTime = 0;
    mockRAF.mockClear();
    mockMatchMedia.mockReturnValue({ matches: false });
  });

  afterEach(() => {
    cancelAllTweens();
  });

  it('should focus camera on node position', () => {
    const onComplete = vi.fn();

    focusOnNode(camera, [10, 5, 10], { onComplete });

    // Simulate completion
    mockTime = 1000;
    mockRAF.mock.calls[0][0](mockTime);

    expect(camera.position.set).toHaveBeenCalled();
    // Camera should be above and behind the node
    const setPosition = camera.position.set.mock.calls[0];
    expect(setPosition[0]).toBe(10); // Same X
    expect(setPosition[1]).toBeGreaterThan(5); // Above node
    expect(setPosition[2]).toBeGreaterThan(10); // Behind node
    expect(onComplete).toHaveBeenCalled();
  });
});

describe('focusOnCluster', () => {
  let camera: ReturnType<typeof createMockCamera>;

  beforeEach(() => {
    camera = createMockCamera();
    mockTime = 0;
    mockRAF.mockClear();
    mockMatchMedia.mockReturnValue({ matches: false });
  });

  afterEach(() => {
    cancelAllTweens();
  });

  it('should focus camera on cluster centroid', () => {
    const onComplete = vi.fn();

    focusOnCluster(camera, [0, 0, 0], 10, { onComplete });

    // Simulate completion
    mockTime = 1000;
    mockRAF.mock.calls[0][0](mockTime);

    expect(camera.position.set).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });

  it('should adjust distance based on cluster size', () => {
    // Test with large cluster
    focusOnCluster(camera, [0, 0, 0], 100);

    // Simulate animation to get the final position
    simulateAnimation(500);
    const pos1 = camera.position.set.mock.calls.at(-1);

    // Cancel and reset
    cancelAllTweens();
    camera.position.set.mockClear();

    // Test with small cluster
    focusOnCluster(camera, [0, 0, 0], 5);

    simulateAnimation(500);
    const pos2 = camera.position.set.mock.calls.at(-1);

    // Both positions should be defined
    expect(pos1).toBeDefined();
    expect(pos2).toBeDefined();

    // Larger cluster should result in further camera position
    // Comparing Z distance
    expect(pos1![2]).toBeGreaterThan(pos2![2]);
  });
});

describe('resetCamera', () => {
  let camera: ReturnType<typeof createMockCamera>;

  beforeEach(() => {
    camera = createMockCamera();
    mockTime = 0;
    mockRAF.mockClear();
    mockMatchMedia.mockReturnValue({ matches: false });
  });

  afterEach(() => {
    cancelAllTweens();
  });

  it('should reset camera to default position', () => {
    const onComplete = vi.fn();

    resetCamera(camera, { onComplete });

    // Simulate completion
    mockTime = 1000;
    mockRAF.mock.calls[0][0](mockTime);

    expect(camera.position.set).toHaveBeenCalledWith(0, 50, 100);
    expect(onComplete).toHaveBeenCalled();
  });
});

describe('isTweening', () => {
  let camera: ReturnType<typeof createMockCamera>;

  beforeEach(() => {
    camera = createMockCamera();
    mockMatchMedia.mockReturnValue({ matches: false });
  });

  afterEach(() => {
    cancelAllTweens();
  });

  it('should return false when no tween is active', () => {
    expect(isTweening(camera)).toBe(false);
  });

  it('should return true when tween is active', () => {
    tweenCamera(camera, { position: [10, 20, 30] }, { duration: 500 });
    expect(isTweening(camera)).toBe(true);
  });

  it('should return false after tween completes', () => {
    tweenCamera(camera, { position: [10, 20, 30] }, { duration: 100 });

    // Simulate animation to completion
    simulateAnimation(100);

    expect(isTweening(camera)).toBe(false);
  });
});

describe('cancelAllTweens', () => {
  let camera1: ReturnType<typeof createMockCamera>;
  let camera2: ReturnType<typeof createMockCamera>;

  beforeEach(() => {
    camera1 = createMockCamera();
    camera2 = createMockCamera();
    mockMatchMedia.mockReturnValue({ matches: false });
  });

  it('should cancel all active tweens', () => {
    const onStop1 = vi.fn();
    const onStop2 = vi.fn();

    tweenCamera(camera1, { position: [10, 0, 0] }, { duration: 500, onStop: onStop1 });
    tweenCamera(camera2, { position: [20, 0, 0] }, { duration: 500, onStop: onStop2 });

    cancelAllTweens();

    expect(onStop1).toHaveBeenCalled();
    expect(onStop2).toHaveBeenCalled();
    expect(isTweening(camera1)).toBe(false);
    expect(isTweening(camera2)).toBe(false);
  });
});
