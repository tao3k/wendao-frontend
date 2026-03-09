/**
 * FileTree component tests
 *
 * Tests verify the correct ordering of config push before VFS scan.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { FileTree } from '../FileTree';

const originalFetch = global.fetch;

describe('FileTree', () => {
  const mockOnFileSelect = vi.fn();
  let callOrder: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    callOrder = [];
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const createMockFetch = (config: { paths?: string[]; setUiConfigFails?: boolean } = {}) => {
    return vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/wendao.toml' || url.endsWith('/wendao.toml')) {
        callOrder.push('getConfig');
        const pathsStr = config.paths?.map(p => `"${p}"`).join(', ') || '';
        return {
          ok: true,
          text: async () => `[ui]\nindex_paths = [${pathsStr}]\n`,
        } as Response;
      }

      if (url === '/api/ui/config' && options?.method === 'POST') {
        if (config.setUiConfigFails) {
          callOrder.push('setUiConfig-failed');
          throw new Error('Backend not available');
        }
        callOrder.push('setUiConfig');
        const body = JSON.parse(options?.body as string);
        return { ok: true, json: async () => body } as Response;
      }

      if (url === '/api/vfs/scan') {
        callOrder.push('scanVfs');
        return {
          ok: true,
          json: async () => ({ entries: [], file_count: 0, dir_count: 0, scan_duration_ms: 0 }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;
  };

  it('should call setUiConfig before scanVfs', async () => {
    global.fetch = createMockFetch({ paths: ['docs', 'skills'] });

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(callOrder).toContain('setUiConfig');
    expect(callOrder).toContain('scanVfs');
  });

  it('should push loaded config to backend before scanning VFS', async () => {
    global.fetch = createMockFetch({ paths: ['test-path'] });

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Verify ordering: setUiConfig is called before scanVfs
    expect(callOrder).toEqual(['setUiConfig', 'scanVfs']);
  });

  it('should still scan VFS even if setUiConfig fails', async () => {
    global.fetch = createMockFetch({ paths: ['test'], setUiConfigFails: true });

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // setUiConfig was attempted (even though it failed)
    expect(callOrder).toContain('setUiConfig-failed');
    // scanVfs should still happen
    expect(callOrder).toContain('scanVfs');
    // Verify scanVfs happened after the setUiConfig attempt
    expect(callOrder.indexOf('scanVfs')).toBeGreaterThan(callOrder.indexOf('setUiConfig-failed'));
  });

  it('should handle empty index_paths gracefully', async () => {
    global.fetch = createMockFetch({ paths: [] });

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should still complete the flow in the correct order
    expect(callOrder).toEqual(['setUiConfig', 'scanVfs']);
  });
});
