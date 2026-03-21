import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRepoIndexStatus: vi.fn(),
}));

vi.mock('../../../api', () => ({
  api: {
    getRepoIndexStatus: mocks.getRepoIndexStatus,
  },
}));

import { toRepoIndexStatusSnapshot } from './repoIndexStatus';

describe('repoIndexStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes repo index status payload for the status bar', () => {
    expect(
      toRepoIndexStatusSnapshot({
        total: 3,
        queued: 1,
        checking: 0,
        syncing: 1,
        indexing: 0,
        ready: 1,
        unsupported: 0,
        failed: 1,
        currentRepoId: 'sciml',
      })
    ).toEqual({
      total: 3,
      queued: 1,
      checking: 0,
      syncing: 1,
      indexing: 0,
      ready: 1,
      unsupported: 0,
      failed: 1,
      currentRepoId: 'sciml',
    });
  });
});
