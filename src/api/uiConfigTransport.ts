import type { UiCapabilities } from "./apiContracts";
import { fetchControlPlaneUiCapabilities } from "./controlPlane/transport";

export interface UiConfigTransportDeps {
  apiBase: string;
  handleResponse: <T>(response: Response) => Promise<T>;
  fetchImpl?: typeof fetch;
}

export interface UiConfigTransportState {
  getUiCapabilitiesSync(): UiCapabilities | null;
  resetUiCapabilitiesCache(): void;
  loadUiCapabilities(): Promise<UiCapabilities>;
  withUiConfigSyncRetry<T>(run: () => Promise<T>): Promise<T>;
}

export function createUiConfigTransportState(deps: UiConfigTransportDeps): UiConfigTransportState {
  const getFetchImpl = (): typeof fetch => deps.fetchImpl ?? fetch;

  let uiCapabilitiesCache: UiCapabilities | null = null;

  return {
    getUiCapabilitiesSync(): UiCapabilities | null {
      return uiCapabilitiesCache;
    },

    resetUiCapabilitiesCache(): void {
      uiCapabilitiesCache = null;
    },

    async loadUiCapabilities(): Promise<UiCapabilities> {
      const capabilities = await fetchControlPlaneUiCapabilities<Partial<UiCapabilities>>({
        apiBase: deps.apiBase,
        fetchImpl: getFetchImpl(),
        handleResponse: deps.handleResponse,
      });
      uiCapabilitiesCache = {
        supportedLanguages: capabilities.supportedLanguages ?? [],
        supportedRepositories: capabilities.supportedRepositories ?? [],
        supportedKinds: capabilities.supportedKinds ?? [],
      };
      return uiCapabilitiesCache;
    },

    async withUiConfigSyncRetry<T>(run: () => Promise<T>): Promise<T> {
      return run();
    },
  };
}
