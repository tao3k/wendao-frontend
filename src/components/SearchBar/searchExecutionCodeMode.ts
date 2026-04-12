import type { RepoOverviewFacet } from "./repoOverviewQueryBuilder";
import { requestRepoIndexPriority } from "../repoIndexPriority";
import {
  buildStandaloneCodeModeOutcome,
  fetchStandaloneCodeSearchResponse,
  resolveCodeSearchIntentMeta,
  resolveRepoAwareCodeModeOutcome,
} from "./searchExecutionCodeModeHelpers";
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
    requestRepoIndexPriority(repoFilter);
    const repoFacet = options.repoFacet ?? null;
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
