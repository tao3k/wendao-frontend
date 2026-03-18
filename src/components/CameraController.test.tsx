/**
 * Tests for CameraController component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

// Mock @react-three/fiber FIRST
const mockCamera = {
  position: { x: 0, y: 0, z: 0, set: vi.fn((x, y, z) => {
    mockCamera.position.x = x;
    mockCamera.position.y = y;
    mockCamera.position.z = z;
  }) },
  lookAt: vi.fn(),
  updateProjectionMatrix: vi.fn(),
  zoom: 1,
  quaternion: { x: 0, y: 0, z: 0, w: 1 },
};

vi.mock('@react-three/fiber', () => ({
  useThree: () => ({ camera: mockCamera }),
  useFrame: vi.fn(),
}));

// Mock tweenCamera BEFORE importing
const mockFocusOnNode = vi.fn(() => () => {});
const mockFocusOnCluster = vi.fn(() => () => {});
const mockResetCamera = vi.fn(() => () => {});
const mockIsTweening = vi.fn(() => false);
const mockGetDefaultDuration = vi.fn(() => 500);

vi.mock('../lib/camera/tweenCamera', () => ({
  focusOnNode: () => mockFocusOnNode(),
  focusOnCluster: () => mockFocusOnCluster(),
  resetCamera: () => mockResetCamera(),
  isTweening: () => mockIsTweening(),
  getDefaultDuration: () => mockGetDefaultDuration(),
}));

// Mock eventBus BEFORE importing
const unsubscribeMock = vi.fn();
const eventHandlers: Array<[string, (payload: unknown) => void]> = [];
const onMock = vi.fn((event: string, handler: (payload: unknown) => void) => {
  eventHandlers.push([event, handler]);
  return unsubscribeMock;
});

vi.mock('../lib/EventBus', () => ({
  eventBus: {
    on: (event: string, handler: (payload: unknown) => void) => onMock(event, handler),
  },
}));

// NOW import the component
import { CameraController } from './CameraController';

describe('CameraController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers.length = 0;
    mockCamera.position.set.mockClear();
    mockCamera.lookAt.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    eventHandlers.length = 0;
  });

  describe('rendering', () => {
    it('should render nothing', () => {
      const { container } = render(<CameraController />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('event subscriptions', () => {
    it('should subscribe to node:selected event when autoFocus is true', () => {
      render(<CameraController autoFocus={true} />);

      const nodeSelectedSub = eventHandlers.find(([eventName]) => eventName === 'node:selected');
      expect(nodeSelectedSub).toBeDefined();
    });

    it('should not subscribe to node:selected when autoFocus is false', () => {
      render(<CameraController autoFocus={false} />);

      const nodeSelectedSub = eventHandlers.find(([eventName]) => eventName === 'node:selected');
      expect(nodeSelectedSub).toBeUndefined();
    });

    it('should subscribe to camera:focus event', () => {
      render(<CameraController />);

      const cameraFocusSub = eventHandlers.find(([eventName]) => eventName === 'camera:focus');
      expect(cameraFocusSub).toBeDefined();
    });
  });

  describe('camera:focus event handling', () => {
    it('should call focusOnNode when target is node', () => {
      render(<CameraController />);

      const cameraFocusSub = eventHandlers.find(([eventName]) => eventName === 'camera:focus');
      if (!cameraFocusSub) {
        throw new Error('camera:focus handler not registered');
      }
      const handler = cameraFocusSub[1];

      act(() => {
        handler({
          target: 'node',
          position: [10, 5, 10],
        });
      });

      expect(mockFocusOnNode).toHaveBeenCalled();
    });

    it('should call focusOnCluster when target is cluster', () => {
      render(<CameraController />);

      const cameraFocusSub = eventHandlers.find(([eventName]) => eventName === 'camera:focus');
      if (!cameraFocusSub) {
        throw new Error('camera:focus handler not registered');
      }
      const handler = cameraFocusSub[1];

      act(() => {
        handler({
          target: 'cluster',
          centroid: [0, 0, 0],
          nodeCount: 10,
        });
      });

      expect(mockFocusOnCluster).toHaveBeenCalled();
    });

    it('should call resetCamera when target is reset', () => {
      render(<CameraController />);

      const cameraFocusSub = eventHandlers.find(([eventName]) => eventName === 'camera:focus');
      if (!cameraFocusSub) {
        throw new Error('camera:focus handler not registered');
      }
      const handler = cameraFocusSub[1];

      act(() => {
        handler({
          target: 'reset',
        });
      });

      expect(mockResetCamera).toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should reset camera on Escape key', () => {
      render(<CameraController enableKeyboardShortcuts={true} />);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(mockResetCamera).toHaveBeenCalled();
    });

    it('should not respond to keyboard when disabled', () => {
      render(<CameraController enableKeyboardShortcuts={false} />);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(mockResetCamera).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from events on unmount', () => {
      const { unmount } = render(<CameraController />);
      unmount();

      // Should call unsubscribe for each subscription
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});
