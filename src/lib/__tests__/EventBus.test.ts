import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../EventBus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  describe('on/off', () => {
    it('should subscribe to events', () => {
      const callback = vi.fn();
      eventBus.on('node:selected', callback);

      eventBus.emit('node:selected', {
        id: 'test-1',
        name: 'Test Node',
        type: 'task',
        source: '2d',
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-1' })
      );
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('node:selected', callback);

      unsubscribe();

      eventBus.emit('node:selected', {
        id: 'test-1',
        name: 'Test',
        type: 'task',
        source: '2d',
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('node:selected', callback1);
      eventBus.on('node:selected', callback2);

      eventBus.emit('node:selected', {
        id: 'test-1',
        name: 'Test',
        type: 'task',
        source: '2d',
      });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should remove specific listener with off', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('node:selected', callback1);
      eventBus.on('node:selected', callback2);
      eventBus.off('node:selected', callback1);

      eventBus.emit('node:selected', {
        id: 'test-1',
        name: 'Test',
        type: 'task',
        source: '2d',
      });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should fire callback only once', () => {
      const callback = vi.fn();
      eventBus.once('node:selected', callback);

      eventBus.emit('node:selected', {
        id: 'test-1',
        name: 'Test',
        type: 'task',
        source: '2d',
      });

      eventBus.emit('node:selected', {
        id: 'test-2',
        name: 'Test 2',
        type: 'event',
        source: '3d',
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-1' })
      );
    });
  });

  describe('emit', () => {
    it('should not throw if no listeners', () => {
      expect(() =>
        eventBus.emit('node:selected', {
          id: 'test',
          name: 'Test',
          type: 'task',
          source: '2d',
        })
      ).not.toThrow();
    });

    it('should handle errors in listeners gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();

      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.on('node:selected', errorCallback);
      eventBus.on('node:selected', normalCallback);

      eventBus.emit('node:selected', {
        id: 'test',
        name: 'Test',
        type: 'task',
        source: '2d',
      });

      expect(normalCallback).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should clear all listeners', () => {
      const callback = vi.fn();
      eventBus.on('node:selected', callback);
      eventBus.on('node:activated', callback);

      eventBus.clear();

      eventBus.emit('node:selected', {
        id: 'test',
        name: 'Test',
        type: 'task',
        source: '2d',
      });
      eventBus.emit('node:activated', { id: 'test', state: 'active' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should clear specific event listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('node:selected', callback1);
      eventBus.on('node:activated', callback2);

      eventBus.clear('node:selected');

      eventBus.emit('node:selected', {
        id: 'test',
        name: 'Test',
        type: 'task',
        source: '2d',
      });
      eventBus.emit('node:activated', { id: 'test', state: 'active' });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });
});
