import type { useSearchDataFlow } from './useSearchDataFlow';

export type SearchDataFlowParams = Parameters<typeof useSearchDataFlow>[0];

export function buildSearchDataFlowParams(params: SearchDataFlowParams): SearchDataFlowParams {
  return {
    ...params,
  };
}
