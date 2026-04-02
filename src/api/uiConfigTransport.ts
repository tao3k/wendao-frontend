import type { UiCapabilities } from './apiContracts';

export interface UiConfigTransportDeps {
  apiBase: string;
  handleResponse: <T>(response: Response) => Promise<T>;
  getConfig: () => Promise<unknown>;
  toUiConfig: (config: unknown) => unknown;
  shouldRetryWithUiConfigSync: (error: unknown) => boolean;
  fetchImpl?: typeof fetch;
  now?: () => number;
  hasWindow?: () => boolean;
  prewarmIntervalMs?: number;
}

export interface UiConfigTransportState {
  getUiCapabilitiesSync(): UiCapabilities | null;
  resetUiCapabilitiesCache(): void;
  loadUiCapabilities(): Promise<UiCapabilities>;
  withUiConfigSyncRetry<T>(run: () => Promise<T>): Promise<T>;
}

export function createUiConfigTransportState(deps: UiConfigTransportDeps): UiConfigTransportState {
  const now = deps.now ?? (() => Date.now());
  const hasWindow = deps.hasWindow ?? (() => typeof window !== 'undefined');
  const prewarmIntervalMs = deps.prewarmIntervalMs ?? 5_000;
  const getFetchImpl = (): typeof fetch => deps.fetchImpl ?? fetch;

  let uiConfigSyncInFlight: Promise<boolean> | null = null;
  let lastUiConfigPrewarmAt = 0;
  let uiCapabilitiesCache: UiCapabilities | null = null;

  async function syncGatewayUiConfigFromFrontend(): Promise<boolean> {
    if (!hasWindow()) {
      return false;
    }
    if (!uiConfigSyncInFlight) {
      uiConfigSyncInFlight = (async () => {
        try {
          const config = await deps.getConfig();
          const uiConfig = deps.toUiConfig(config);
          const response = await getFetchImpl()(`${deps.apiBase}/ui/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uiConfig),
          });
          await deps.handleResponse<void>(response);
          return true;
        } catch {
          return false;
        } finally {
          uiConfigSyncInFlight = null;
        }
      })();
    }
    return uiConfigSyncInFlight;
  }

  async function prewarmGatewayUiConfigIfStale(): Promise<void> {
    if (!hasWindow()) {
      return;
    }
    const current = now();
    if (current - lastUiConfigPrewarmAt < prewarmIntervalMs) {
      return;
    }
    const synced = await syncGatewayUiConfigFromFrontend();
    if (synced) {
      lastUiConfigPrewarmAt = current;
    }
  }

  return {
    getUiCapabilitiesSync(): UiCapabilities | null {
      return uiCapabilitiesCache;
    },

    resetUiCapabilitiesCache(): void {
      uiCapabilitiesCache = null;
    },

    async loadUiCapabilities(): Promise<UiCapabilities> {
      const response = await getFetchImpl()(`${deps.apiBase}/ui/capabilities`);
      const capabilities = await deps.handleResponse<Partial<UiCapabilities>>(response);
      uiCapabilitiesCache = {
        supportedLanguages: capabilities.supportedLanguages ?? [],
        supportedRepositories: capabilities.supportedRepositories ?? [],
        supportedKinds: capabilities.supportedKinds ?? [],
      };
      return uiCapabilitiesCache;
    },

    async withUiConfigSyncRetry<T>(run: () => Promise<T>): Promise<T> {
      await prewarmGatewayUiConfigIfStale();
      try {
        return await run();
      } catch (error) {
        if (!deps.shouldRetryWithUiConfigSync(error)) {
          throw error;
        }
        const synced = await syncGatewayUiConfigFromFrontend();
        if (!synced) {
          throw error;
        }
        return run();
      }
    },
  };
}
