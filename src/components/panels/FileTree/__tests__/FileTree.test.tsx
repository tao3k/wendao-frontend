/**
 * FileTree component tests
 *
 * Tests verify the correct ordering of config push before VFS scan.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { FileTree } from '../FileTree';

const originalFetch = global.fetch;

describe('FileTree', () => {
  const mockOnFileSelect = vi.fn();
  let callOrder: string[] = [];
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    callOrder = [];
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  const createMockFetch = (config: { paths?: string[]; setUiConfigFails?: boolean } = {}) => {
    return vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/wendao.toml' || url.endsWith('/wendao.toml')) {
        callOrder.push('getConfig');
        const pathsStr = config.paths?.map(p => `"${p}"`).join(', ') || '';
        return {
          ok: true,
          text: async () =>
            `[link_graph.projects.kernel]\nroot = "."\npaths = [${pathsStr}]\nwatch_patterns = ["**/*.md", "**/SKILL.md"]\ninclude_dirs_auto = true\ninclude_dirs_auto_candidates = ["docs", "internal_skills"]\n`,
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

    // Verify ordering: config is loaded first, then pushed before scanVfs
    expect(callOrder).toEqual(['getConfig', 'setUiConfig', 'scanVfs']);
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

  it('does not rescan the VFS when expanding or collapsing folders', async () => {
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/wendao.toml' || url.endsWith('/wendao.toml')) {
        return {
          ok: true,
          text: async () =>
            `[link_graph.projects.kernel]\nroot = "."\npaths = ["docs"]\nwatch_patterns = ["**/*.md"]\ninclude_dirs_auto = false\ninclude_dirs_auto_candidates = []\n`,
        } as Response;
      }

      if (url === '/api/ui/config' && options?.method === 'POST') {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === '/api/vfs/scan') {
        callOrder.push('scanVfs');
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: 'docs',
                name: 'docs',
                isDir: true,
                category: 'folder',
              },
              {
                path: 'docs/guide.md',
                name: 'guide.md',
                isDir: false,
                category: 'doc',
              },
            ],
            file_count: 1,
            dir_count: 1,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(callOrder.filter((entry) => entry === 'scanVfs')).toHaveLength(1);

    fireEvent.click(screen.getByText('docs'));
    fireEvent.click(screen.getByText('docs'));

    expect(callOrder.filter((entry) => entry === 'scanVfs')).toHaveLength(1);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should handle empty project paths gracefully', async () => {
    global.fetch = createMockFetch({ paths: [] });

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should still complete the flow in the correct order
    expect(callOrder).toEqual(['getConfig', 'setUiConfig', 'scanVfs']);
  });

  it('should block the explorer and show the real gateway error when loading fails', async () => {
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/wendao.toml' || url.endsWith('/wendao.toml')) {
        return { ok: false, status: 500 } as Response;
      }

      if (url === '/api/ui/config' && options?.method === 'POST') {
        throw new Error('Backend not available');
      }

      if (url === '/api/vfs/scan') {
        throw new Error('Backend not available');
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Gateway sync blocked.')).toBeInTheDocument();
    expect(screen.getByText('Studio requires a healthy gateway before the project tree can be shown.')).toBeInTheDocument();
    expect(screen.getByText('Backend not available')).toBeInTheDocument();
    expect(screen.queryByText('skills')).not.toBeInTheDocument();
  });

  it('recovers from fallback when retry gateway sync is clicked', async () => {
    let scanAttempts = 0;

    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/wendao.toml' || url.endsWith('/wendao.toml')) {
        return {
          ok: true,
          text: async () =>
            `[link_graph.projects.kernel]\nroot = "."\npaths = ["docs"]\nwatch_patterns = ["**/*.md"]\ninclude_dirs_auto = false\ninclude_dirs_auto_candidates = []\n`,
        } as Response;
      }

      if (url === '/api/ui/config' && options?.method === 'POST') {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === '/api/vfs/scan') {
        scanAttempts += 1;
        if (scanAttempts === 1) {
          throw new Error('Gateway unavailable');
        }
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: 'docs',
                name: 'docs',
                isDir: true,
                category: 'folder',
              },
            ],
            file_count: 0,
            dir_count: 1,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Gateway sync blocked.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry gateway sync' }));

    await waitFor(() => {
      expect(screen.queryByText('Gateway sync blocked.')).not.toBeInTheDocument();
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    expect(scanAttempts).toBe(2);
  });

  it('recovers from fallback when the window regains focus', async () => {
    let scanAttempts = 0;

    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/wendao.toml' || url.endsWith('/wendao.toml')) {
        return {
          ok: true,
          text: async () =>
            `[link_graph.projects.kernel]\nroot = "."\npaths = ["docs"]\nwatch_patterns = ["**/*.md"]\ninclude_dirs_auto = false\ninclude_dirs_auto_candidates = []\n`,
        } as Response;
      }

      if (url === '/api/ui/config' && options?.method === 'POST') {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === '/api/vfs/scan') {
        scanAttempts += 1;
        if (scanAttempts === 1) {
          throw new Error('Gateway unavailable');
        }
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: 'docs',
                name: 'docs',
                isDir: true,
                category: 'folder',
              },
            ],
            file_count: 0,
            dir_count: 1,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Gateway sync blocked.')).toBeInTheDocument();
    });

    fireEvent(window, new Event('focus'));

    await waitFor(() => {
      expect(screen.queryByText('Gateway sync blocked.')).not.toBeInTheDocument();
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    expect(scanAttempts).toBe(2);
  });

  it('should group monorepo roots under project names for the left tree', async () => {
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/wendao.toml' || url.endsWith('/wendao.toml')) {
        return {
          ok: true,
          text: async () =>
            `[link_graph.projects.alpha]\nroot = "/workspace/packages/alpha"\npaths = ["docs"]\nwatch_patterns = ["**/*.md"]\ninclude_dirs_auto = false\ninclude_dirs_auto_candidates = []\n\n[link_graph.projects.beta]\nroot = "/workspace/packages/beta"\npaths = ["docs"]\nwatch_patterns = ["**/*.md"]\ninclude_dirs_auto = false\ninclude_dirs_auto_candidates = []\n`,
        } as Response;
      }

      if (url === '/api/ui/config' && options?.method === 'POST') {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === '/api/vfs/scan') {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: 'alpha-docs',
                name: 'alpha / docs',
                isDir: true,
                category: 'folder',
                projectName: 'alpha',
                rootLabel: 'docs',
              },
              {
                path: 'alpha-docs/guide.md',
                name: 'guide.md',
                isDir: false,
                category: 'doc',
                projectName: 'alpha',
                rootLabel: 'docs',
              },
              {
                path: 'beta-docs',
                name: 'beta / docs',
                isDir: true,
                category: 'folder',
                projectName: 'beta',
                rootLabel: 'docs',
              },
              {
                path: 'beta-docs/readme.md',
                name: 'readme.md',
                isDir: false,
                category: 'doc',
                projectName: 'beta',
                rootLabel: 'docs',
              },
            ],
            file_count: 2,
            dir_count: 2,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
    fireEvent.click(screen.getByText('alpha'));
    fireEvent.click(screen.getByText('beta'));
    expect(screen.getAllByText('docs')).toHaveLength(2);
  });

  it('should use project names from wendao.toml when scan entries miss project metadata', async () => {
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/wendao.toml' || url.endsWith('/wendao.toml')) {
        return {
          ok: true,
          text: async () =>
            `[link_graph.projects.alpha]\nroot = "/workspace/packages/alpha"\npaths = ["docs"]\nwatch_patterns = ["**/*.md"]\ninclude_dirs_auto = false\ninclude_dirs_auto_candidates = []\n\n[link_graph.projects.beta]\nroot = "/workspace/packages/beta"\npaths = ["docs"]\nwatch_patterns = ["**/*.md"]\ninclude_dirs_auto = false\ninclude_dirs_auto_candidates = []\n`,
        } as Response;
      }

      if (url === '/api/ui/config' && options?.method === 'POST') {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === '/api/vfs/scan') {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: 'alpha-docs',
                name: 'docs',
                isDir: true,
                category: 'folder',
              },
              {
                path: 'alpha-docs/guide.md',
                name: 'guide.md',
                isDir: false,
                category: 'doc',
              },
              {
                path: 'beta-docs',
                name: 'docs',
                isDir: true,
                category: 'folder',
              },
              {
                path: 'beta-docs/readme.md',
                name: 'readme.md',
                isDir: false,
                category: 'doc',
              },
            ],
            file_count: 2,
            dir_count: 2,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
    fireEvent.click(screen.getByText('alpha'));
    expect(screen.getAllByText('guide.md')).toHaveLength(1);
  });

  it('should forward project metadata when selecting a grouped file', async () => {
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/wendao.toml' || url.endsWith('/wendao.toml')) {
        return {
          ok: true,
          text: async () =>
            `[link_graph.projects.alpha]\nroot = "/workspace/packages/alpha"\npaths = ["docs"]\nwatch_patterns = ["**/*.md"]\ninclude_dirs_auto = false\ninclude_dirs_auto_candidates = []\n`,
        } as Response;
      }

      if (url === '/api/ui/config' && options?.method === 'POST') {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === '/api/vfs/scan') {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: 'alpha-docs',
                name: 'alpha / docs',
                isDir: true,
                category: 'folder',
                projectName: 'alpha',
                rootLabel: 'docs',
              },
              {
                path: 'alpha-docs/guide.md',
                name: 'guide.md',
                isDir: false,
                category: 'doc',
                projectName: 'alpha',
                rootLabel: 'docs',
              },
            ],
            file_count: 1,
            dir_count: 1,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    if (!screen.queryByText('docs')) {
      fireEvent.click(screen.getByText('alpha'));
    }

    await waitFor(() => {
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('docs'));

    await waitFor(() => {
      expect(screen.getByText('guide.md')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('guide.md'));

    expect(mockOnFileSelect).toHaveBeenCalledWith('alpha-docs/guide.md', 'doc', {
      projectName: 'alpha',
      rootLabel: 'docs',
    });
  });

  it('should forward inferred project metadata when scan entry misses project fields', async () => {
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/wendao.toml' || url.endsWith('/wendao.toml')) {
        return {
          ok: true,
          text: async () =>
            `[link_graph.projects.alpha]\nroot = "/workspace/packages/alpha"\npaths = ["docs"]\nwatch_patterns = ["**/*.md"]\ninclude_dirs_auto = false\ninclude_dirs_auto_candidates = []\n`,
        } as Response;
      }

      if (url === '/api/ui/config' && options?.method === 'POST') {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === '/api/vfs/scan') {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: 'alpha-docs',
                name: 'docs',
                isDir: true,
                category: 'folder',
              },
              {
                path: 'alpha-docs/guide.md',
                name: 'guide.md',
                isDir: false,
                category: 'doc',
              },
            ],
            file_count: 1,
            dir_count: 1,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('alpha'));
    fireEvent.click(screen.getByText('docs'));
    fireEvent.click(screen.getByText('guide.md'));

    expect(mockOnFileSelect).toHaveBeenCalledWith('alpha-docs/guide.md', 'doc', {
      projectName: 'alpha',
      rootLabel: 'docs',
    });
  });
});
