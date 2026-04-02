import { describe, expectTypeOf, it } from 'vitest';
import type {
  RepoBacklinkItem,
  RepoIndexStatusResponse,
  RepoModuleSearchResponse,
  RepoSymbolSearchResponse,
  UiCapabilities,
  UiJuliaDeploymentArtifact,
} from './apiContracts';

describe('api contracts', () => {
  it('keeps the repo module response contract stable', () => {
    expectTypeOf<RepoModuleSearchResponse>().toMatchTypeOf<{
      repoId: string;
      modules: Array<{
        moduleId: string;
        qualifiedName: string;
        path: string;
      }>;
    }>();
  });

  it('keeps the repo symbol response contract stable', () => {
    expectTypeOf<RepoSymbolSearchResponse>().toMatchTypeOf<{
      repoId: string;
      symbols: Array<{
        symbolId: string;
        name: string;
        kind: string;
        path: string;
      }>;
    }>();
  });

  it('keeps the UI capabilities contract stable', () => {
    expectTypeOf<UiCapabilities>().toEqualTypeOf<{
      supportedLanguages: string[];
      supportedRepositories: string[];
      supportedKinds: string[];
    }>();
  });

  it('keeps the Julia deployment artifact contract stable', () => {
    expectTypeOf<UiJuliaDeploymentArtifact>().toEqualTypeOf<{
      artifactSchemaVersion: string;
      generatedAt: string;
      baseUrl?: string;
      route?: string;
      healthRoute?: string;
      schemaVersion?: string;
      timeoutSecs?: number;
      launch: {
        launcherPath: string;
        args: string[];
      };
    }>();
  });

  it('keeps the repo backlink item contract stable', () => {
    expectTypeOf<RepoBacklinkItem>().toEqualTypeOf<{
      id: string;
      title?: string;
      path?: string;
      kind?: string;
    }>();
  });

  it('keeps the repo index status contract stable', () => {
    expectTypeOf<RepoIndexStatusResponse>().toMatchTypeOf<{
      total: number;
      repos: Array<{
        repoId: string;
        phase: string;
        attemptCount: number;
      }>;
    }>();
  });
});
