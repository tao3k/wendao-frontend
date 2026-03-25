import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RepoDiagnosticsPage } from './RepoDiagnosticsPage';
import { api } from '../api';
import type { RepoIndexStatus } from './StatusBar';

vi.mock('../api', () => ({
  api: {
    getRepoIndexStatus: vi.fn(),
    enqueueRepoIndex: vi.fn(),
  },
}));

const baseRepoIndexStatus: RepoIndexStatus = {
  total: 6,
  queued: 0,
  checking: 0,
  syncing: 0,
  indexing: 0,
  ready: 2,
  unsupported: 2,
  failed: 2,
  targetConcurrency: 3,
  maxConcurrency: 15,
  syncConcurrencyLimit: 2,
  currentRepoId: 'sciml',
  linkGraphOnlyProjectCount: 2,
  linkGraphOnlyProjectIds: ['kernel', 'main'],
  unsupportedReasons: [
    {
      reason: 'missing Project.toml',
      count: 1,
      repoIds: ['StokesDiffEq.jl'],
    },
    {
      reason: 'missing Manifest.toml',
      count: 1,
      repoIds: ['TensorFlowDiffEq.jl'],
    },
  ],
  issues: [
    {
      repoId: 'AutoOffload.jl',
      phase: 'failed',
      lastError: 'socket timeout',
    },
    {
      repoId: 'AutoOptimize.jl',
      phase: 'failed',
      lastError: 'auth failed',
    },
  ],
};

const refreshedRepoIndexResponse = {
  total: 6,
  queued: 1,
  checking: 0,
  syncing: 0,
  indexing: 0,
  ready: 2,
  unsupported: 2,
  failed: 1,
  repos: [
    {
      repoId: 'RetryLater.jl',
      phase: 'queued',
      queuePosition: 1,
      attemptCount: 1,
    },
    {
      repoId: 'AutoOptimize.jl',
      phase: 'failed',
      lastError: 'auth failed',
      attemptCount: 1,
    },
    {
      repoId: 'StokesDiffEq.jl',
      phase: 'unsupported',
      lastError: 'unsupported layout: missing Project.toml',
      attemptCount: 1,
    },
    {
      repoId: 'TensorFlowDiffEq.jl',
      phase: 'unsupported',
      lastError: 'unsupported layout: missing Manifest.toml',
      attemptCount: 1,
    },
  ],
};

function buildManagedMirrorConnectError(repoId: string): string {
  return `repo intelligence analysis failed: failed to refresh managed mirror \`${repoId}\` from \`https://github.com/SciML/${repoId}.git\`: failed to connect to github.com: Can't assign requested address; class=Os (2)`;
}

const groupedTransportRepoIndexStatus: RepoIndexStatus = {
  ...baseRepoIndexStatus,
  unsupported: 0,
  failed: 2,
  unsupportedReasons: [],
  issues: [
    {
      repoId: 'BipartiteGraphs.jl',
      phase: 'failed',
      lastError: buildManagedMirrorConnectError('BipartiteGraphs.jl'),
    },
    {
      repoId: 'CatalystNetworkAnalysis.jl',
      phase: 'failed',
      lastError: buildManagedMirrorConnectError('CatalystNetworkAnalysis.jl'),
    },
  ],
};

function clickFirstButton(name: string): void {
  fireEvent.click(screen.getAllByRole('button', { name })[0]);
}

describe('RepoDiagnosticsPage', () => {
  let clipboardWriteTextMock: ReturnType<typeof vi.fn>;
  let createObjectUrlMock: ReturnType<typeof vi.fn>;
  let revokeObjectUrlMock: ReturnType<typeof vi.fn>;
  let anchorClickMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '';
    vi.mocked(api.getRepoIndexStatus).mockReset();
    vi.mocked(api.enqueueRepoIndex).mockReset();
    clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteTextMock },
    });
    createObjectUrlMock = vi.fn(() => 'blob:repo-diagnostics');
    revokeObjectUrlMock = vi.fn();
    anchorClickMock = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrlMock,
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(anchorClickMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores unsupported filter state from the diagnostics hash', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Unsupported 1 · missing Project.toml')).toBeInTheDocument();
    });

    expect(screen.queryByText('Unsupported 1 · missing Manifest.toml')).not.toBeInTheDocument();
  });

  it('writes selected failed filters back into the diagnostics hash', async () => {
    window.location.hash = '#repo-diagnostics';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Failed (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'socket timeout (1)' }));

    await waitFor(() => {
      expect(window.location.hash).toContain('#repo-diagnostics?');
    });

    const [, search = ''] = window.location.hash.split('?');
    const params = new URLSearchParams(search);
    expect(params.get('filter')).toBe('failed');
    expect(params.get('failedReason')).toBe('socket timeout');
  });

  it('opens a repo detail pane and writes the selected repo into the diagnostics hash', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'StokesDiffEq.jl' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'StokesDiffEq.jl' })).toBeInTheDocument();
    expect(screen.getByText(/Phase: Unsupported/)).toBeInTheDocument();
    expect(screen.getByText(/Reason: missing Project\.toml/)).toBeInTheDocument();

    const [, search = ''] = window.location.hash.split('?');
    const params = new URLSearchParams(search);
    expect(params.get('filter')).toBe('unsupported');
    expect(params.get('unsupportedReason')).toBe('missing Project.toml');
    expect(params.get('repo')).toBe('StokesDiffEq.jl');
  });

  it('retries the selected failed repo from the detail pane', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=socket%20timeout';
    vi.mocked(api.enqueueRepoIndex).mockResolvedValue(undefined);
    vi.mocked(api.getRepoIndexStatus).mockResolvedValue(refreshedRepoIndexResponse);
    const onStatusChange = vi.fn();

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={onStatusChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Failed AutoOffload.jl · socket timeout' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'AutoOffload.jl' })).toBeInTheDocument();
    });
    expect(
      within(screen.getByTestId('repo-diagnostics-selected-repo')).getByText(
        'Suggested next step: retry this repo or failure family. If it repeats, lower the repo-index sync limit and inspect outbound GitHub connectivity.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry repo' }));

    await waitFor(() => {
      expect(api.enqueueRepoIndex).toHaveBeenCalledWith({ repo: 'AutoOffload.jl', refresh: true });
    });
    await waitFor(() => {
      expect(api.getRepoIndexStatus).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledTimes(1);
    });
  });

  it('copies a failed repo remediation preset from the detail pane', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=auth%20failed';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Failed AutoOptimize.jl · auth failed' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy failure preset' }));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);
    });

    const copiedText = clipboardWriteTextMock.mock.calls[0]?.[0] as string;
    expect(copiedText).toContain('repo = "AutoOptimize.jl"');
    expect(copiedText).toContain('reason_key = "auth_failed"');
    expect(copiedText).toContain('family = "auth_access"');
    expect(copiedText).toContain('action_key = "verify_git_credentials_and_remote_access"');
    expect(copiedText).toContain('retry_scope = "manual"');
    expect(copiedText).toContain('retryable = false');
    expect(copiedText).toContain('follow_up_checks = ["git_credential", "repository_visibility", "remote_url_access"]');
    expect(copiedText).toContain('credential_checklist = ["git credential", "repository visibility", "remote URL access"]');
  });

  it('copies a transient transport remediation command from the detail pane', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=socket%20timeout';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Failed AutoOffload.jl · socket timeout' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy remediation command' }));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);
    });

    const copiedText = clipboardWriteTextMock.mock.calls[0]?.[0] as string;
    expect(copiedText).toContain('# action_key = retry_with_lower_sync_concurrency');
    expect(copiedText).toContain('# retry_scope = repo');
    expect(copiedText).toContain('XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY="1"');
    expect(copiedText).toContain('/api/repo/index');
    expect(copiedText).toContain(`"repo":"AutoOffload.jl"`);
  });

  it('copies the selected repo diagnostics brief', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'StokesDiffEq.jl' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy repo diagnostics' }));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);
    });

    const copiedText = clipboardWriteTextMock.mock.calls[0]?.[0] as string;
    expect(copiedText).toContain('repo = "StokesDiffEq.jl"');
    expect(copiedText).toContain('phase = "unsupported"');
    expect(copiedText).toContain('reason = "missing Project.toml"');
  });

  it('downloads a remediation bundle for the selected repo', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'StokesDiffEq.jl' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download remediation bundle' }));

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('# Repo remediation bundle');
    await expect(blob.text()).resolves.toContain('## Diagnostics brief');
    await expect(blob.text()).resolves.toContain('## Fix template');
    await expect(blob.text()).resolves.toContain('## Link-graph-only preset');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('downloads a failure plan for the selected failed repo', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=auth%20failed';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Failed AutoOptimize.jl · auth failed' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download failure plan' }));

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('# Repo diagnostics failure plan');
    await expect(blob.text()).resolves.toContain('scope_filter = "failed"');
    await expect(blob.text()).resolves.toContain('selected_repo = "AutoOptimize.jl"');
    await expect(blob.text()).resolves.toContain('current_repo = "sciml"');
    await expect(blob.text()).resolves.toContain('reason = "auth failed"');
    await expect(blob.text()).resolves.toContain('reason_key = "auth_failed"');
    await expect(blob.text()).resolves.toContain('family = "auth_access"');
    await expect(blob.text()).resolves.toContain('action_key = "verify_git_credentials_and_remote_access"');
    await expect(blob.text()).resolves.toContain('retry_scope = "manual"');
    await expect(blob.text()).resolves.toContain('credential_checklist = ["git credential", "repository visibility", "remote URL access"]');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('downloads a remediation runbook for the selected failed repo', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=socket%20timeout';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Failed AutoOffload.jl · socket timeout' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download remediation runbook' }));

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('# Repo diagnostics remediation runbook');
    await expect(blob.text()).resolves.toContain('## Scope');
    await expect(blob.text()).resolves.toContain('selected_repo = "AutoOffload.jl"');
    await expect(blob.text()).resolves.toContain('failed_reason = "socket timeout"');
    await expect(blob.text()).resolves.toContain('## Summary');
    await expect(blob.text()).resolves.toContain('failure_family_count = 1');
    await expect(blob.text()).resolves.toContain('affected_repo_count = 1');
    await expect(blob.text()).resolves.toContain('affected_repos = ["AutoOffload.jl"]');
    await expect(blob.text()).resolves.toContain('## Failure plan');
    await expect(blob.text()).resolves.toContain('# Repo diagnostics failure plan');
    await expect(blob.text()).resolves.toContain('reason_key = "socket_timeout"');
    await expect(blob.text()).resolves.toContain('## Remediation script');
    await expect(blob.text()).resolves.toContain('#!/usr/bin/env bash');
    await expect(blob.text()).resolves.toContain('# retry_scope = "repo"');
    await expect(blob.text()).resolves.toContain('# env_overrides = { XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY = "1" }');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('downloads a remediation command for the selected failed repo', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=socket%20timeout';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Failed AutoOffload.jl · socket timeout' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download remediation command' }));

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('#!/usr/bin/env bash');
    await expect(blob.text()).resolves.toContain('set -euo pipefail');
    await expect(blob.text()).resolves.toContain('# Repo diagnostics remediation script');
    await expect(blob.text()).resolves.toContain('# generated_at = "');
    await expect(blob.text()).resolves.toContain('# scope_filter = "failed"');
    await expect(blob.text()).resolves.toContain('# failed_reason = "socket timeout"');
    await expect(blob.text()).resolves.toContain('# selected_repo = "AutoOffload.jl"');
    await expect(blob.text()).resolves.toContain('# current_repo = "sciml"');
    await expect(blob.text()).resolves.toContain('# analysis_target_concurrency = 3');
    await expect(blob.text()).resolves.toContain('# analysis_max_concurrency = 15');
    await expect(blob.text()).resolves.toContain('# sync_concurrency_limit = 2');
    await expect(blob.text()).resolves.toContain('# reason_key = "socket_timeout"');
    await expect(blob.text()).resolves.toContain('# action_key = "retry_with_lower_sync_concurrency"');
    await expect(blob.text()).resolves.toContain('# retry_scope = "repo"');
    await expect(blob.text()).resolves.toContain('# env_overrides = { XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY = "1" }');
    await expect(blob.text()).resolves.toContain(
      '# follow_up_checks = ["outbound_github_connectivity", "ephemeral_port_pressure", "managed_mirror_retry_queue"]'
    );
    await expect(blob.text()).resolves.toContain('# action_key = retry_with_lower_sync_concurrency');
    await expect(blob.text()).resolves.toContain('# retry_scope = repo');
    await expect(blob.text()).resolves.toContain('XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY="1"');
    await expect(blob.text()).resolves.toContain(`"repo":"AutoOffload.jl"`);
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('downloads a config patch for the selected unsupported repo', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'StokesDiffEq.jl' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download config patch' }));

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('# Repo diagnostics config patch');
    await expect(blob.text()).resolves.toContain('scope_filter = "unsupported"');
    await expect(blob.text()).resolves.toContain('selected_repo = "StokesDiffEq.jl"');
    await expect(blob.text()).resolves.toContain('current_repo = "sciml"');
    await expect(blob.text()).resolves.toContain('[link_graph.projects."StokesDiffEq.jl"]');
    await expect(blob.text()).resolves.toContain('plugins = []');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('downloads the current diagnostics triage bundle for the active filter slice', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=socket%20timeout';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    clickFirstButton('Download current triage bundle');

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('# Repo diagnostics triage bundle');
    await expect(blob.text()).resolves.toContain('filter = "failed"');
    await expect(blob.text()).resolves.toContain('failed_reason = "socket timeout"');
    await expect(blob.text()).resolves.toContain('## Runtime context');
    await expect(blob.text()).resolves.toContain('current_repo = "sciml"');
    await expect(blob.text()).resolves.toContain('analysis_target_concurrency = 3');
    await expect(blob.text()).resolves.toContain('sync_concurrency_limit = 2');
    await expect(blob.text()).resolves.toContain('link_graph_only_projects = ["kernel", "main"]');
    await expect(blob.text()).resolves.toContain('## Failure groups');
    await expect(blob.text()).resolves.toContain('## Failure presets');
    await expect(blob.text()).resolves.toContain('reason_key = "socket_timeout"');
    await expect(blob.text()).resolves.toContain('action_key = "retry_with_lower_sync_concurrency"');
    await expect(blob.text()).resolves.toContain('retry_scope = "failure_family"');
    await expect(blob.text()).resolves.toContain('retryable = true');
    await expect(blob.text()).resolves.toContain(
      'guidance = "Suggested next step: retry this repo or failure family. If it repeats, lower the repo-index sync limit and inspect outbound GitHub connectivity."'
    );
    await expect(blob.text()).resolves.toContain(
      'suggested_action = "Retry this failed family after checking remote sync pressure and outbound connectivity"'
    );
    await expect(blob.text()).resolves.toContain('suggested_sync_concurrency_limit = 1');
    await expect(blob.text()).resolves.toContain('repo = "AutoOffload.jl"');
    await expect(blob.text()).resolves.not.toContain('repo = "AutoOptimize.jl"');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('downloads the current diagnostics pack with triage, failed runbook, and config patch artifacts', async () => {
    window.location.hash = '#repo-diagnostics';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download current diagnostics pack' }));

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('# Repo diagnostics pack');
    await expect(blob.text()).resolves.toContain('## Scope');
    await expect(blob.text()).resolves.toContain('scope_filter = "all"');
    await expect(blob.text()).resolves.toContain('## Operator summary');
    await expect(blob.text()).resolves.toContain('failure_family_count = 2');
    await expect(blob.text()).resolves.toContain('retryable_failure_family_count = 1');
    await expect(blob.text()).resolves.toContain('manual_failure_family_count = 1');
    await expect(blob.text()).resolves.toContain('unsupported_group_count = 2');
    await expect(blob.text()).resolves.toContain(
      'action_keys = ["retry_with_lower_sync_concurrency", "verify_git_credentials_and_remote_access"]'
    );
    await expect(blob.text()).resolves.toContain(
      'follow_up_checks = ["ephemeral_port_pressure", "git_credential", "managed_mirror_retry_queue", "outbound_github_connectivity", "remote_url_access", "repository_visibility"]'
    );
    await expect(blob.text()).resolves.toContain('suggested_sync_concurrency_limit = 1');
    await expect(blob.text()).resolves.toContain(
      'Fix hint: add Project.toml at the repo root, or move docs-only projects to link-graph-only config with plugins=[].'
    );
    await expect(blob.text()).resolves.toContain('## Included artifacts');
    await expect(blob.text()).resolves.toContain('triage_bundle = true');
    await expect(blob.text()).resolves.toContain('failure_remediation_runbook = true');
    await expect(blob.text()).resolves.toContain('config_patch = true');
    await expect(blob.text()).resolves.toContain('## Triage bundle');
    await expect(blob.text()).resolves.toContain('# Repo diagnostics triage bundle');
    await expect(blob.text()).resolves.toContain('## Failure remediation runbook');
    await expect(blob.text()).resolves.toContain('# Repo diagnostics remediation runbook');
    await expect(blob.text()).resolves.toContain('reason_key = "socket_timeout"');
    await expect(blob.text()).resolves.toContain('reason_key = "auth_failed"');
    await expect(blob.text()).resolves.toContain('## Config patch');
    await expect(blob.text()).resolves.toContain('[link_graph.projects."StokesDiffEq.jl"]');
    await expect(blob.text()).resolves.not.toContain('[link_graph.projects."TensorFlowDiffEq.jl"]');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('renders the current slice operator summary on the page', async () => {
    window.location.hash = '#repo-diagnostics';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    const summary = screen.getByTestId('repo-diagnostics-operator-summary');
    expect(summary).toHaveTextContent('Current slice action summary');
    expect(summary).toHaveTextContent('Failure families: 2');
    expect(summary).toHaveTextContent('Retryable: 1');
    expect(summary).toHaveTextContent('Manual: 1');
    expect(summary).toHaveTextContent('Unsupported groups: 2');
    expect(summary).toHaveTextContent('Suggested sync limit: 1');
    expect(summary).toHaveTextContent(
      'Actions: retry_with_lower_sync_concurrency, verify_git_credentials_and_remote_access'
    );
    expect(summary).toHaveTextContent(
      'Checks: ephemeral_port_pressure, git_credential, managed_mirror_retry_queue, outbound_github_connectivity, remote_url_access, repository_visibility'
    );
    expect(summary).toHaveTextContent(
      'Suggested next step: retry this repo or failure family. If it repeats, lower the repo-index sync limit and inspect outbound GitHub connectivity.'
    );
    expect(summary).toHaveTextContent(
      'Fix hint: add Project.toml at the repo root, or move docs-only projects to link-graph-only config with plugins=[].'
    );
  });

  it('focuses a failed family directly from the current slice action summary', async () => {
    window.location.hash = '#repo-diagnostics';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Focus retry_with_lower_sync_concurrency · socket timeout (1)',
      })
    );

    await waitFor(() => {
      expect(window.location.hash).toContain('#repo-diagnostics?');
    });

    const [, search = ''] = window.location.hash.split('?');
    const params = new URLSearchParams(search);
    expect(params.get('filter')).toBe('failed');
    expect(params.get('failedReason')).toBe('socket timeout');
    expect(params.get('unsupportedReason')).toBeNull();
  });

  it('focuses the unsupported slice directly from the current slice action summary', async () => {
    window.location.hash = '#repo-diagnostics';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Focus unsupported slice' }));

    await waitFor(() => {
      expect(window.location.hash).toContain('#repo-diagnostics?');
    });

    const [, search = ''] = window.location.hash.split('?');
    const params = new URLSearchParams(search);
    expect(params.get('filter')).toBe('unsupported');
    expect(params.get('failedReason')).toBeNull();
    expect(params.get('unsupportedReason')).toBeNull();
  });

  it('renders focused failed-family actions when a failed family is active', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=socket%20timeout';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    const focusedActions = screen.getByTestId('repo-diagnostics-focused-actions');
    expect(focusedActions).toHaveTextContent('Focused failed family: socket timeout');
    expect(within(focusedActions).getByRole('button', { name: 'Retry filtered failed' })).toBeInTheDocument();
    expect(within(focusedActions).getByRole('button', { name: 'Download current remediation runbook' })).toBeInTheDocument();
    expect(within(focusedActions).getByRole('button', { name: 'More exports' })).toBeInTheDocument();
    expect(within(focusedActions).getByRole('button', { name: 'Back to all diagnostics' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy current remediation command' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download current failure plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download current remediation command' })).not.toBeInTheDocument();
  });

  it('renders focused unsupported actions when an unsupported slice is active', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    const focusedActions = screen.getByTestId('repo-diagnostics-focused-actions');
    expect(focusedActions).toHaveTextContent('Focused unsupported reason: missing Project.toml');
    expect(within(focusedActions).getByRole('button', { name: 'Download current config patch' })).toBeInTheDocument();
    expect(within(focusedActions).getByRole('button', { name: 'More exports' })).toBeInTheDocument();
    expect(within(focusedActions).getByRole('button', { name: 'Back to all diagnostics' })).toBeInTheDocument();
    expect(within(focusedActions).queryByRole('button', { name: 'Copy unsupported manifest' })).not.toBeInTheDocument();
    expect(within(focusedActions).queryByRole('button', { name: 'Download current triage bundle' })).not.toBeInTheDocument();
  });

  it('reveals focused failed-family secondary exports on demand', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=socket%20timeout';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(
      within(screen.getByTestId('repo-diagnostics-focused-actions')).getByRole('button', {
        name: 'More exports',
      })
    );

    const focusedActions = screen.getByTestId('repo-diagnostics-focused-actions');
    expect(within(focusedActions).getByRole('button', { name: 'Less exports' })).toBeInTheDocument();
    expect(within(focusedActions).getByRole('button', { name: 'Copy current remediation command' })).toBeInTheDocument();
    expect(within(focusedActions).getByRole('button', { name: 'Download current failure plan' })).toBeInTheDocument();
    expect(within(focusedActions).getByRole('button', { name: 'Download current remediation command' })).toBeInTheDocument();
  });

  it('reveals focused unsupported secondary exports on demand', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(
      within(screen.getByTestId('repo-diagnostics-focused-actions')).getByRole('button', {
        name: 'More exports',
      })
    );

    const focusedActions = screen.getByTestId('repo-diagnostics-focused-actions');
    expect(within(focusedActions).getByRole('button', { name: 'Less exports' })).toBeInTheDocument();
    expect(within(focusedActions).getByRole('button', { name: 'Copy unsupported manifest' })).toBeInTheDocument();
    expect(within(focusedActions).getByRole('button', { name: 'Download current triage bundle' })).toBeInTheDocument();
  });

  it('returns to the full diagnostics slice from the focused action bar', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=socket%20timeout';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(
      within(screen.getByTestId('repo-diagnostics-focused-actions')).getByRole('button', {
        name: 'Back to all diagnostics',
      })
    );

    await waitFor(() => {
      expect(window.location.hash).toBe('#repo-diagnostics');
    });

    const [, search = ''] = window.location.hash.split('?');
    const params = new URLSearchParams(search);
    expect(params.get('filter')).toBeNull();
    expect(params.get('failedReason')).toBeNull();
    expect(params.get('unsupportedReason')).toBeNull();
  });

  it('downloads the current failure plan for failed slices', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed&failedReason=socket%20timeout';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(
      within(screen.getByTestId('repo-diagnostics-focused-actions')).getByRole('button', {
        name: 'More exports',
      })
    );
    clickFirstButton('Download current failure plan');

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('# Repo diagnostics failure plan');
    await expect(blob.text()).resolves.toContain('scope_filter = "failed"');
    await expect(blob.text()).resolves.toContain('failed_reason = "socket timeout"');
    await expect(blob.text()).resolves.toContain('current_repo = "sciml"');
    await expect(blob.text()).resolves.toContain('reason = "socket timeout"');
    await expect(blob.text()).resolves.toContain('reason_key = "socket_timeout"');
    await expect(blob.text()).resolves.toContain('family = "transient_transport"');
    await expect(blob.text()).resolves.toContain('action_key = "retry_with_lower_sync_concurrency"');
    await expect(blob.text()).resolves.toContain('retry_scope = "failure_family"');
    await expect(blob.text()).resolves.toContain('env_overrides = { XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY = "1" }');
    await expect(blob.text()).resolves.toContain(
      'follow_up_checks = ["outbound_github_connectivity", "ephemeral_port_pressure", "managed_mirror_retry_queue"]'
    );
    await expect(blob.text()).resolves.toContain('suggested_sync_concurrency_limit = 1');
    await expect(blob.text()).resolves.not.toContain('auth failed');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('downloads the current remediation runbook for failed slices', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={groupedTransportRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    clickFirstButton('Download current remediation runbook');

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('# Repo diagnostics remediation runbook');
    await expect(blob.text()).resolves.toContain('## Scope');
    await expect(blob.text()).resolves.toContain('scope_filter = "failed"');
    await expect(blob.text()).resolves.toContain('## Summary');
    await expect(blob.text()).resolves.toContain('failure_family_count = 1');
    await expect(blob.text()).resolves.toContain('affected_repo_count = 2');
    await expect(blob.text()).resolves.toContain('affected_repos = ["BipartiteGraphs.jl", "CatalystNetworkAnalysis.jl"]');
    await expect(blob.text()).resolves.toContain('## Failure plan');
    await expect(blob.text()).resolves.toContain('# Repo diagnostics failure plan');
    await expect(blob.text()).resolves.toContain('reason_key = "github_connect_address_unavailable"');
    await expect(blob.text()).resolves.toContain('## Remediation script');
    await expect(blob.text()).resolves.toContain('#!/usr/bin/env bash');
    await expect(blob.text()).resolves.toContain('# action_key = "retry_with_lower_sync_concurrency"');
    await expect(blob.text()).resolves.toContain('# env_overrides = { XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY = "1" }');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('downloads the current remediation command for failed slices', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={groupedTransportRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(
      within(screen.getByTestId('repo-diagnostics-focused-actions')).getByRole('button', {
        name: 'More exports',
      })
    );
    clickFirstButton('Download current remediation command');

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('#!/usr/bin/env bash');
    await expect(blob.text()).resolves.toContain('set -euo pipefail');
    await expect(blob.text()).resolves.toContain('# Repo diagnostics remediation script');
    await expect(blob.text()).resolves.toContain('# generated_at = "');
    await expect(blob.text()).resolves.toContain('# scope_filter = "failed"');
    await expect(blob.text()).resolves.toContain('# current_repo = "sciml"');
    await expect(blob.text()).resolves.toContain('# analysis_target_concurrency = 3');
    await expect(blob.text()).resolves.toContain('# analysis_max_concurrency = 15');
    await expect(blob.text()).resolves.toContain('# sync_concurrency_limit = 2');
    await expect(blob.text()).resolves.toContain('# reason_key = "github_connect_address_unavailable"');
    await expect(blob.text()).resolves.toContain('# action_key = "retry_with_lower_sync_concurrency"');
    await expect(blob.text()).resolves.toContain('# retry_scope = "failure_family"');
    await expect(blob.text()).resolves.toContain('# env_overrides = { XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY = "1" }');
    await expect(blob.text()).resolves.toContain(
      '# follow_up_checks = ["outbound_github_connectivity", "ephemeral_port_pressure", "managed_mirror_retry_queue"]'
    );
    await expect(blob.text()).resolves.toContain('# Repo diagnostics remediation commands');
    await expect(blob.text()).resolves.toContain('# action_key = retry_with_lower_sync_concurrency');
    await expect(blob.text()).resolves.toContain('# retry_scope = failure_family');
    await expect(blob.text()).resolves.toContain('# repos = BipartiteGraphs.jl, CatalystNetworkAnalysis.jl');
    await expect(blob.text()).resolves.toContain('XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY="1"');
    await expect(blob.text()).resolves.toContain(`"repo":"BipartiteGraphs.jl"`);
    await expect(blob.text()).resolves.toContain(`"repo":"CatalystNetworkAnalysis.jl"`);
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('groups repo-specific github transport failures into one failure family plan', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={groupedTransportRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(
      within(screen.getByTestId('repo-diagnostics-focused-actions')).getByRole('button', {
        name: 'More exports',
      })
    );
    clickFirstButton('Download current failure plan');

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain(
      'reason = "failed to connect to github.com: can\'t assign requested address"'
    );
    await expect(blob.text()).resolves.toContain('reason_key = "github_connect_address_unavailable"');
    await expect(blob.text()).resolves.toContain(
      'repos = ["BipartiteGraphs.jl", "CatalystNetworkAnalysis.jl"]'
    );
    await expect(blob.text()).resolves.toContain('action_key = "retry_with_lower_sync_concurrency"');
    await expect(blob.text()).resolves.toContain('retry_scope = "failure_family"');
    await expect(blob.text()).resolves.toContain('env_overrides = { XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY = "1" }');
    await expect(blob.text()).resolves.toContain('retryable = true');
    await expect(blob.text()).resolves.toContain('sample_errors = [');
    await expect(blob.text()).resolves.toContain('failed to refresh managed mirror `BipartiteGraphs.jl`');
  });

  it('copies a current remediation command for the active failed slice', async () => {
    window.location.hash = '#repo-diagnostics?filter=failed';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={groupedTransportRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(
      within(screen.getByTestId('repo-diagnostics-focused-actions')).getByRole('button', {
        name: 'More exports',
      })
    );
    clickFirstButton('Copy current remediation command');

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);
    });

    const copiedText = clipboardWriteTextMock.mock.calls[0]?.[0] as string;
    expect(copiedText).toContain('# Repo diagnostics remediation commands');
    expect(copiedText).toContain('# action_key = retry_with_lower_sync_concurrency');
    expect(copiedText).toContain('# retry_scope = failure_family');
    expect(copiedText).toContain('# repos = BipartiteGraphs.jl, CatalystNetworkAnalysis.jl');
    expect(copiedText).toContain('XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY="1"');
    expect(copiedText).toContain(`"repo":"BipartiteGraphs.jl"`);
    expect(copiedText).toContain(`"repo":"CatalystNetworkAnalysis.jl"`);
  });

  it('downloads unsupported presets in the current diagnostics triage bundle for unsupported slices', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(
      within(screen.getByTestId('repo-diagnostics-focused-actions')).getByRole('button', {
        name: 'More exports',
      })
    );
    clickFirstButton('Download current triage bundle');

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('filter = "unsupported"');
    await expect(blob.text()).resolves.toContain('unsupported_reason = "missing Project.toml"');
    await expect(blob.text()).resolves.toContain('## Unsupported presets');
    await expect(blob.text()).resolves.toContain('preset_kind = "link_graph_only"');
    await expect(blob.text()).resolves.toContain(
      'suggested_action = "If these repositories are docs-only, move them to link_graph.projects.* with plugins = []"'
    );
    await expect(blob.text()).resolves.toContain('alternate_action = "Add Project.toml at the repository root"');
    await expect(blob.text()).resolves.toContain('repos = ["StokesDiffEq.jl"]');
    await expect(blob.text()).resolves.not.toContain('TensorFlowDiffEq.jl');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('downloads the current config patch for unsupported slices with link-graph-only presets', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    clickFirstButton('Download current config patch');

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toContain('# Repo diagnostics config patch');
    await expect(blob.text()).resolves.toContain('scope_filter = "unsupported"');
    await expect(blob.text()).resolves.toContain('unsupported_reason = "missing Project.toml"');
    await expect(blob.text()).resolves.toContain('current_repo = "sciml"');
    await expect(blob.text()).resolves.toContain('[link_graph.projects."StokesDiffEq.jl"]');
    await expect(blob.text()).resolves.not.toContain('TensorFlowDiffEq.jl');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:repo-diagnostics');
  });

  it('copies an unsupported repo fix template from the detail pane', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'StokesDiffEq.jl' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy fix template' }));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);
    });

    const copiedText = clipboardWriteTextMock.mock.calls[0]?.[0] as string;
    expect(copiedText).toContain('repo = "StokesDiffEq.jl"');
    expect(copiedText).toContain('reason = "missing Project.toml"');
    expect(copiedText).toContain('primary_action = "Add Project.toml at the repository root"');
  });

  it('copies a link-graph-only preset for missing Project.toml repos', async () => {
    window.location.hash = '#repo-diagnostics?filter=unsupported&unsupportedReason=missing%20Project.toml';

    render(
      <RepoDiagnosticsPage
        locale="en"
        repoIndexStatus={baseRepoIndexStatus}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'StokesDiffEq.jl' }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-diagnostics-selected-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy link-graph-only preset' }));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);
    });

    const copiedText = clipboardWriteTextMock.mock.calls[0]?.[0] as string;
    expect(copiedText).toContain('[link_graph.projects."StokesDiffEq.jl"]');
    expect(copiedText).toContain('plugins = []');
    expect(copiedText).toContain('dirs = ["docs"]');
  });
});
