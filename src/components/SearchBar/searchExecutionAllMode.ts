import { api } from "../../api";
import { stripCodeFilters } from "./codeSearchUtils";
import { errorMessage } from "./searchResultNormalization";
import { executeRepoIntelligenceCodeSearch } from "./repoIntelligenceSearchExecution";
import {
  buildAllModeOutcome,
  createFallbackAttachmentResponse,
  createFallbackAstResponse,
  createFallbackKnowledgeResponse,
  createFallbackReferenceResponse,
  createFallbackSymbolResponse,
} from "./searchExecutionAllModeHelpers";
import {
  resolveCodeSearchIntentMeta,
  resolveRepoAwareCodeModeOutcome,
} from "./searchExecutionCodeModeHelpers";
import type { SearchExecutionOptions, SearchExecutionOutcome } from "./searchExecutionTypes";

function resolveAllModeSemanticQuery(rawQuery: string): string {
  const strippedQuery = stripCodeFilters(rawQuery).trim();
  return strippedQuery.length > 0 ? strippedQuery : rawQuery.trim();
}

async function executeRepoAwareAllModeCodeSearch(
  rawCodeQuery: string,
  repoIntelligenceQuery: string,
  repoFilter: string,
  options: SearchExecutionOptions,
): Promise<SearchExecutionOutcome> {
  const repoFacet = options.repoFacet ?? null;
  const [repoIntelligenceSettled, codeIntentSettled] = await Promise.allSettled([
    executeRepoIntelligenceCodeSearch(repoIntelligenceQuery, repoFilter, {
      facet: repoFacet,
    }),
    resolveCodeSearchIntentMeta(rawCodeQuery, repoFilter, 10),
  ]);

  return resolveRepoAwareCodeModeOutcome({
    queryToSearch: rawCodeQuery,
    repoFilter,
    repoFacet,
    repoIntelligenceSettled,
    codeIntentSettled,
  });
}

export async function executeAllModeSearch(
  queryToSearch: string,
  options: SearchExecutionOptions = {},
): Promise<SearchExecutionOutcome> {
  const repoFilter = options.repoFilter?.trim();
  const trimmedQuery = queryToSearch.trim();
  const semanticQuery = resolveAllModeSemanticQuery(queryToSearch);
  const settled = await Promise.allSettled([
    api.searchKnowledge(semanticQuery, 10, { intent: "hybrid_search" }),
    repoFilter
      ? executeRepoAwareAllModeCodeSearch(trimmedQuery, semanticQuery, repoFilter, options)
      : api.searchKnowledge(trimmedQuery, 10, { intent: "code_search" }),
    api.searchAst(semanticQuery, 10),
    api.searchReferences(semanticQuery, 10),
    api.searchSymbols(semanticQuery, 10),
    api.searchAttachments(semanticQuery, 10),
  ]);
  const failures = settled
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => errorMessage(result.reason));

  if (failures.length === settled.length) {
    throw new Error(failures[0] || "Search failed");
  }

  const knowledgeResponse =
    settled[0].status === "fulfilled"
      ? settled[0].value
      : createFallbackKnowledgeResponse(queryToSearch, "hybrid_search", "hybrid");
  const codeOutcome = repoFilter && settled[1].status === "fulfilled" ? settled[1].value : null;
  const codeResponse =
    !repoFilter && settled[1].status === "fulfilled"
      ? settled[1].value
      : createFallbackKnowledgeResponse(trimmedQuery, "code_search", "code_search");
  const astResponse =
    settled[2].status === "fulfilled" ? settled[2].value : createFallbackAstResponse(queryToSearch);
  const referenceResponse =
    settled[3].status === "fulfilled"
      ? settled[3].value
      : createFallbackReferenceResponse(queryToSearch);
  const symbolResponse =
    settled[4].status === "fulfilled"
      ? settled[4].value
      : createFallbackSymbolResponse(queryToSearch);
  const attachmentResponse =
    settled[5].status === "fulfilled"
      ? settled[5].value
      : createFallbackAttachmentResponse(queryToSearch);

  return buildAllModeOutcome({
    queryToSearch,
    knowledgeResponse,
    codeResponse,
    codeOutcome,
    astResponse,
    referenceResponse,
    symbolResponse,
    attachmentResponse,
    failures,
  });
}
