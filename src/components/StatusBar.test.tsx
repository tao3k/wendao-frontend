import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('renders active VFS state with breathing neon selection styling', () => {
    const { container } = render(
      <StatusBar
        nodeCount={4}
        selectedNodeId="T1"
        vfsStatus={{ isLoading: false, error: null }}
      />
    );

    expect(screen.getByText('VFS Connected')).toBeInTheDocument();
    expect(container.querySelector('.status-dot--active')).toBeInTheDocument();
    expect(screen.getByText('Selected: T1')).toHaveClass('status-text--accent', 'animate-breathe');
  });

  it('renders warning status while loading', () => {
    const { container } = render(
      <StatusBar nodeCount={2} vfsStatus={{ isLoading: true, error: null }} />
    );

    expect(screen.getByText('VFS Loading...')).toBeInTheDocument();
    expect(container.querySelector('.status-dot--warning')).toBeInTheDocument();
  });

  it('renders repo index progress in a separate chip', () => {
    render(
      <StatusBar
        nodeCount={2}
        vfsStatus={{ isLoading: false, error: null }}
        repoIndexStatus={{
          total: 3,
          queued: 1,
          checking: 0,
          syncing: 1,
          indexing: 0,
          ready: 1,
          unsupported: 0,
          failed: 0,
          targetConcurrency: 3,
          maxConcurrency: 15,
          syncConcurrencyLimit: 2,
          currentRepoId: 'sciml',
          linkGraphOnlyProjectCount: 2,
          linkGraphOnlyProjectIds: ['kernel', 'main'],
          queuedRepos: [{ repoId: 'mcl', queuePosition: 1 }],
        }}
      />
    );

    expect(screen.getByText('Repo index processed 1/3')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Repo index 1/3 · Queued 1 · Checking 0 · Syncing 1 · Indexing 0 · Unsupported 0 · Failed 0 · Current sciml · Next mcl #1'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Analysis budget 3/15 · Sync limit 2')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Excluded from repo index (2 link-graph-only projects, plugins=[]): kernel, main'
      )
    ).toBeInTheDocument();
  });

  it('renders repo index issue details for unsupported and failed repositories', () => {
    render(
      <StatusBar
        nodeCount={2}
        vfsStatus={{ isLoading: false, error: null }}
        repoIndexStatus={{
          total: 3,
          queued: 0,
          checking: 0,
          syncing: 0,
          indexing: 0,
          ready: 1,
          unsupported: 1,
          failed: 1,
          currentRepoId: 'mcl',
          issues: [
            {
              repoId: 'mcl',
              phase: 'failed',
              lastError: "repo intelligence plugin `modelica` is not registered",
            },
            {
              repoId: 'DiffEqApproxFun.jl',
              phase: 'unsupported',
              lastError: 'missing Project.toml',
            },
          ],
          unsupportedReasons: [
            {
              reason: 'missing Project.toml',
              count: 2,
              repoIds: ['DiffEqApproxFun.jl', 'TensorFlowDiffEq.jl'],
            },
          ],
        }}
      />
    );

    expect(screen.getByText('Repo index processed 3/3')).toBeInTheDocument();
    expect(screen.getByText('Unsupported layouts 1 · missing Project.toml (2)')).toBeInTheDocument();
    expect(
      screen.getByText('missing Project.toml: DiffEqApproxFun.jl, TensorFlowDiffEq.jl')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Repo issues 2 · failed mcl: repo intelligence plugin `modelica` is not registered · unsupported DiffEqApproxFun.jl: missing Project.toml"
      )
    ).toBeInTheDocument();
  });

  it('opens diagnostics when the repo index chip is clicked', () => {
    const onOpenRepoDiagnostics = vi.fn();

    render(
      <StatusBar
        nodeCount={2}
        vfsStatus={{ isLoading: false, error: null }}
        onOpenRepoDiagnostics={onOpenRepoDiagnostics}
        repoIndexStatus={{
          total: 3,
          queued: 1,
          checking: 0,
          syncing: 1,
          indexing: 0,
          ready: 1,
          unsupported: 0,
          failed: 0,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open repo index diagnostics' }));

    expect(onOpenRepoDiagnostics).toHaveBeenCalledTimes(1);
  });

  it('renders Julia deployment artifact details as a status chip', () => {
    render(
      <StatusBar
        nodeCount={2}
        vfsStatus={{ isLoading: false, error: null }}
        juliaDeploymentArtifact={{
          artifactSchemaVersion: 'v1',
          generatedAt: '2026-03-27T12:00:00Z',
          baseUrl: 'http://127.0.0.1:18080',
          route: '/rerank',
          healthRoute: '/healthz',
          schemaVersion: 'v1',
          timeoutSecs: 30,
          launch: {
            launcherPath: '.data/WendaoAnalyzer/scripts/run_analyzer_service.sh',
            args: ['--service-mode', 'stream', '--analyzer-strategy', 'similarity_only'],
          },
        }}
      />
    );

    expect(screen.getByText('Julia rerank similarity_only')).toBeInTheDocument();
    expect(screen.getByText('Julia deployment artifact')).toBeInTheDocument();
    expect(screen.getByText('Service mode stream')).toBeInTheDocument();
    expect(screen.getByText('Analyzer strategy similarity_only')).toBeInTheDocument();
    expect(
      screen.getByText('Launcher .data/WendaoAnalyzer/scripts/run_analyzer_service.sh')
    ).toBeInTheDocument();
  });

  it('runs Julia artifact export actions and shows success feedback', async () => {
    const onCopyJuliaDeploymentArtifactToml = vi.fn().mockResolvedValue(undefined);
    const onDownloadJuliaDeploymentArtifactJson = vi.fn();

    render(
      <StatusBar
        nodeCount={2}
        vfsStatus={{ isLoading: false, error: null }}
        juliaDeploymentArtifact={{
          artifactSchemaVersion: 'v1',
          generatedAt: '2026-03-27T12:00:00Z',
          launch: {
            launcherPath: '.data/WendaoAnalyzer/scripts/run_analyzer_service.sh',
            args: ['--service-mode', 'stream'],
          },
        }}
        onCopyJuliaDeploymentArtifactToml={onCopyJuliaDeploymentArtifactToml}
        onDownloadJuliaDeploymentArtifactJson={onDownloadJuliaDeploymentArtifactJson}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy TOML' }));
    expect(onCopyJuliaDeploymentArtifactToml).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('TOML copied')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
    expect(onDownloadJuliaDeploymentArtifactJson).toHaveBeenCalledTimes(1);
    expect(screen.getByText('JSON downloaded')).toBeInTheDocument();
  });
});
