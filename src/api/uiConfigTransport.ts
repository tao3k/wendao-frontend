import * as TOML from "smol-toml";
import type { UiCapabilities } from "./apiContracts";
import type { UiConfig } from "./bindings";
import {
  fetchControlPlaneUiCapabilities,
  postControlPlaneUiConfig,
} from "./controlPlane/transport";
import { ApiClientError } from "./responseTransport";
import type { WendaoConfig } from "../config/loader";
import { toUiConfig } from "../config/loader";

export interface UiConfigTransportDeps {
  apiBase: string;
  handleResponse: <T>(response: Response) => Promise<T>;
  fetchImpl?: typeof fetch;
  onUiConfigSynced?: (config: UiConfig) => void;
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

  const isUnknownRepositoryError = (error: unknown): boolean => {
    if (error instanceof ApiClientError) {
      return error.code === "UNKNOWN_REPOSITORY" || error.message.includes("UNKNOWN_REPOSITORY");
    }

    return error instanceof Error && error.message.includes("UNKNOWN_REPOSITORY");
  };

  const loadUiConfigFromLocalToml = async (): Promise<UiConfig> => {
    const response = await getFetchImpl()("/wendao.toml");
    if (!response.ok) {
      throw new Error(`wendao.toml could not be loaded: HTTP ${response.status}`);
    }

    const tomlContent = await response.text();
    const parsed = TOML.parse(tomlContent) as unknown as WendaoConfig;
    return toUiConfig(parsed);
  };

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
      try {
        return await run();
      } catch (error) {
        if (!isUnknownRepositoryError(error)) {
          throw error;
        }

        const uiConfig = await loadUiConfigFromLocalToml();
        await postControlPlaneUiConfig(
          {
            apiBase: deps.apiBase,
            fetchImpl: getFetchImpl(),
            handleResponse: deps.handleResponse,
          },
          uiConfig,
        );
        deps.onUiConfigSynced?.(uiConfig);

        return run();
      }
    },
  };
}
