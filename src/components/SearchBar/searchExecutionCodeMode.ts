import type { RepoOverviewFacet } from "./repoOverviewQueryBuilder";
import { requestRepoIndexPriority } from "../repoIndexPriority";
import { normalizeCodeSearchQuery } from "./codeSearchUtils";
import {
  buildStandaloneCodeModeOutcome,
  buildRepoScopedBackendCodeModeOutcome,
  fetchRepoScopedCodeSearchResponse,
  fetchStandaloneCodeSearchResponse,
  resolveCodeSearchIntentMeta,
  resolveRepoAwareCodeModeOutcome,
} from "./searchExecutionCodeModeHelpers";
import { resolveRepoScopedBackendCodeSearchQuery } from "./repoProjectConfig";
import { executeRepoIntelligenceCodeSearch } from "./repoIntelligenceSearchExecution";
import type { SearchExecutionOutcome } from "./searchExecutionTypes";

export interface CodeModeExecutionOptions {
  repoFilter?: string;
  repoFacet?: RepoOverviewFacet | null;
  signal?: AbortSignal;
}

export async function executeCodeModeSearch(
  queryToSearch: string,
  options: CodeModeExecutionOptions = {},
): Promise<SearchExecutionOutcome> {
  const normalizedCodeQuery = normalizeCodeSearchQuery(queryToSearch);
  const repoFilter = options.repoFilter?.trim();
  if (repoFilter) {
    const repoFacet = options.repoFacet ?? null;
    const backendCodeSearchQuery = resolveRepoScopedBackendCodeSearchQuery(
      normalizedCodeQuery,
      repoFilter,
      repoFacet,
    );
    if (backendCodeSearchQuery) {
      const codeResponse = await fetchRepoScopedCodeSearchResponse(
        backendCodeSearchQuery,
        repoFilter,
        10,
        options.signal,
      );
      return buildRepoScopedBackendCodeModeOutcome({
        query: normalizedCodeQuery,
        repoFilter,
        repoFacet,
        codeResponse,
      });
    }
    requestRepoIndexPriority(repoFilter);
    const [repoIntelligenceSettled, codeIntentSettled] = await Promise.allSettled([
      executeRepoIntelligenceCodeSearch(normalizedCodeQuery, repoFilter, {
        facet: repoFacet,
        signal: options.signal,
      }),
      resolveCodeSearchIntentMeta(normalizedCodeQuery, repoFilter, 10, options.signal),
    ]);
    return resolveRepoAwareCodeModeOutcome({
      queryToSearch: normalizedCodeQuery,
      repoFilter,
      repoFacet,
      repoIntelligenceSettled,
      codeIntentSettled,
    });
  }

  const codeResponse = await fetchStandaloneCodeSearchResponse(
    normalizedCodeQuery,
    10,
    options.signal,
  );
  return buildStandaloneCodeModeOutcome(codeResponse);
}
