import { describe, expect, expectTypeOf, it } from 'vitest';
import { ApiClientError, api } from './index';
import type {
  RepoSyncResponse,
  UiCapabilities,
  UiJuliaDeploymentArtifact,
} from './index';

describe('api client facade', () => {
  it('re-exports the runtime api surface', () => {
    expect(typeof api.health).toBe('function');
    expect(typeof api.searchKnowledge).toBe('function');
    expect(typeof api.getUiCapabilities).toBe('function');
    expect(typeof api.getJuliaDeploymentArtifact).toBe('function');
    expect(typeof api.getJuliaDeploymentArtifactToml).toBe('function');
  });

  it('re-exports ApiClientError through the facade', () => {
    const error = new ApiClientError('BROKEN', 'broken');

    expect(error.name).toBe('ApiClientError');
    expect(error.code).toBe('BROKEN');
  });

  it('re-exports repo and ui contracts through the facade', () => {
    expectTypeOf<RepoSyncResponse>().toMatchTypeOf<{
      repoId: string;
      mode: string;
      healthState: string;
    }>();
    expectTypeOf<UiCapabilities>().toEqualTypeOf<{
      supportedLanguages: string[];
      supportedRepositories: string[];
      supportedKinds: string[];
    }>();
    expectTypeOf<UiJuliaDeploymentArtifact>().toEqualTypeOf<{
      artifactSchemaVersion: string;
      generatedAt: string;
      launch: {
        launcherPath: string;
        args: string[];
      };
    }>();
  });
});
