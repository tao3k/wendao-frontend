import type { RepoOverviewFacet } from "./repoOverviewQueryBuilder";
import { requestRepoIndexPriority } from "../repoIndexPriority";
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
  const repoFilter = options.repoFilter?.trim();
  if (repoFilter) {
    const repoFacet = options.repoFacet ?? null;
    const backendCodeSearchQuery = resolveRepoScopedBackendCodeSearchQuery(
      queryToSearch,
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
        query: queryToSearch,
        repoFilter,
        repoFacet,
        codeResponse,
      });
    }
    requestRepoIndexPriority(repoFilter);
    const [repoIntelligenceSettled, codeIntentSettled] = await Promise.allSettled([
      executeRepoIntelligenceCodeSearch(queryToSearch, repoFilter, {
        facet: repoFacet,
        signal: options.signal,
      }),
      resolveCodeSearchIntentMeta(queryToSearch, repoFilter, 10, options.signal),
    ]);
    return resolveRepoAwareCodeModeOutcome({
      queryToSearch,
      repoFilter,
      repoFacet,
      repoIntelligenceSettled,
      codeIntentSettled,
    });
  }

  const codeResponse = await fetchStandaloneCodeSearchResponse(queryToSearch, 10, options.signal);
  return buildStandaloneCodeModeOutcome(codeResponse);
}
