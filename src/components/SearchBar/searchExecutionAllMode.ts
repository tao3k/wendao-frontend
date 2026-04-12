import { api } from "../../api";
import type {
  AstSearchResponse,
  AttachmentSearchResponse,
  ReferenceSearchResponse,
  SearchResponse,
  SymbolSearchResponse,
} from "../../api";
import { parseCodeFilters } from "./codeSearchUtils";
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

interface ProgressiveAllModeState {
  knowledgeResponse: SearchResponse | null;
  codeResponse: SearchResponse | null;
  codeOutcome: SearchExecutionOutcome | null;
  astResponse: AstSearchResponse | null;
  referenceResponse: ReferenceSearchResponse | null;
  symbolResponse: SymbolSearchResponse | null;
  attachmentResponse: AttachmentSearchResponse | null;
  failures: string[];
}

function appendFailureMessage(failures: string[], reason: unknown): void {
  const message = errorMessage(reason);
  if (message && !failures.includes(message)) {
    failures.push(message);
  }
}

function buildProgressiveAllModeOutcome(
  queryToSearch: string,
  trimmedQuery: string,
  progress: ProgressiveAllModeState,
): SearchExecutionOutcome {
  return buildAllModeOutcome({
    queryToSearch,
    knowledgeResponse:
      progress.knowledgeResponse ??
      createFallbackKnowledgeResponse(queryToSearch, "hybrid_search", "hybrid"),
    codeResponse:
      progress.codeResponse ??
      createFallbackKnowledgeResponse(trimmedQuery, "code_search", "code_search"),
    codeOutcome: progress.codeOutcome,
    astResponse: progress.astResponse ?? createFallbackAstResponse(queryToSearch),
    referenceResponse: progress.referenceResponse ?? createFallbackReferenceResponse(queryToSearch),
    symbolResponse: progress.symbolResponse ?? createFallbackSymbolResponse(queryToSearch),
    attachmentResponse:
      progress.attachmentResponse ?? createFallbackAttachmentResponse(queryToSearch),
    failures: progress.failures,
  });
}

function shouldRequestRepoAwareAllModeCodeIntentMeta(
  repoFacet: SearchExecutionOptions["repoFacet"],
): boolean {
  return repoFacet == null || repoFacet === "symbol";
}

function resolveAllModeQueryPlan(
  rawQuery: string,
  options: SearchExecutionOptions,
): {
  trimmedQuery: string;
  semanticQuery: string;
  shouldRunSupplementalLanes: boolean;
} {
  const parsed = parseCodeFilters(rawQuery);
  const trimmedQuery = rawQuery.trim();
  const semanticQuery = parsed.baseQuery.length > 0 ? parsed.baseQuery : trimmedQuery;
  const hasInlineCodeFilters =
    parsed.filters.language.length > 0 ||
    parsed.filters.kind.length > 0 ||
    parsed.filters.repo.length > 0 ||
    parsed.filters.path.length > 0;

  return {
    trimmedQuery,
    semanticQuery,
    shouldRunSupplementalLanes: !hasInlineCodeFilters && !(options.repoFacet ?? null),
  };
}

async function executeRepoAwareAllModeCodeSearch(
  rawCodeQuery: string,
  repoIntelligenceQuery: string,
  repoFilter: string,
  options: SearchExecutionOptions,
): Promise<SearchExecutionOutcome> {
  const repoFacet = options.repoFacet ?? null;
  const codeIntentPromise = shouldRequestRepoAwareAllModeCodeIntentMeta(repoFacet)
    ? resolveCodeSearchIntentMeta(rawCodeQuery, repoFilter, 10, options.signal)
    : Promise.resolve(null);
  const [repoIntelligenceSettled, codeIntentSettled] = await Promise.allSettled([
    executeRepoIntelligenceCodeSearch(repoIntelligenceQuery, repoFilter, {
      facet: repoFacet,
      signal: options.signal,
    }),
    codeIntentPromise,
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
  const { trimmedQuery, semanticQuery, shouldRunSupplementalLanes } = resolveAllModeQueryPlan(
    queryToSearch,
    options,
  );
  const progress: ProgressiveAllModeState = {
    knowledgeResponse: null,
    codeResponse: null,
    codeOutcome: null,
    astResponse: null,
    referenceResponse: null,
    symbolResponse: null,
    attachmentResponse: null,
    failures: [],
  };
  const emitProgress = (): void => {
    if (!options.onProgress) {
      return;
    }
    const outcome = buildProgressiveAllModeOutcome(queryToSearch, trimmedQuery, progress);
    if (outcome.results.length === 0) {
      return;
    }
    options.onProgress(outcome);
  };

  const knowledgePromise = api.searchKnowledge(semanticQuery, 10, {
    intent: "hybrid_search",
    ...(options.signal ? { signal: options.signal } : {}),
  });
  const codePromise = repoFilter
    ? executeRepoAwareAllModeCodeSearch(trimmedQuery, semanticQuery, repoFilter, options)
    : api.searchKnowledge(trimmedQuery, 10, {
        intent: "code_search",
        ...(options.signal ? { signal: options.signal } : {}),
      });
  const astPromise = shouldRunSupplementalLanes
    ? options.signal
      ? api.searchAst(semanticQuery, 10, { signal: options.signal })
      : api.searchAst(semanticQuery, 10)
    : Promise.resolve(createFallbackAstResponse(semanticQuery));
  const referencePromise = shouldRunSupplementalLanes
    ? options.signal
      ? api.searchReferences(semanticQuery, 10, { signal: options.signal })
      : api.searchReferences(semanticQuery, 10)
    : Promise.resolve(createFallbackReferenceResponse(semanticQuery));
  const symbolPromise = shouldRunSupplementalLanes
    ? options.signal
      ? api.searchSymbols(semanticQuery, 10, { signal: options.signal })
      : api.searchSymbols(semanticQuery, 10)
    : Promise.resolve(createFallbackSymbolResponse(semanticQuery));
  const attachmentPromise = shouldRunSupplementalLanes
    ? options.signal
      ? api.searchAttachments(semanticQuery, 10, { signal: options.signal })
      : api.searchAttachments(semanticQuery, 10)
    : Promise.resolve(createFallbackAttachmentResponse(semanticQuery));
  const trackedKnowledgePromise = knowledgePromise.then(
    (response) => {
      progress.knowledgeResponse = response;
      emitProgress();
      return response;
    },
    (reason) => {
      appendFailureMessage(progress.failures, reason);
      throw reason;
    },
  );
  const trackedCodePromise = codePromise.then(
    (response) => {
      if (repoFilter) {
        progress.codeOutcome = response as SearchExecutionOutcome;
      } else {
        progress.codeResponse = response as SearchResponse;
      }
      emitProgress();
      return response;
    },
    (reason) => {
      appendFailureMessage(progress.failures, reason);
      throw reason;
    },
  );
  const trackedAstPromise = astPromise.then(
    (response) => {
      progress.astResponse = response;
      if (response.hitCount > 0) {
        emitProgress();
      }
      return response;
    },
    (reason) => {
      appendFailureMessage(progress.failures, reason);
      throw reason;
    },
  );
  const trackedReferencePromise = referencePromise.then(
    (response) => {
      progress.referenceResponse = response;
      if (response.hitCount > 0) {
        emitProgress();
      }
      return response;
    },
    (reason) => {
      appendFailureMessage(progress.failures, reason);
      throw reason;
    },
  );
  const trackedSymbolPromise = symbolPromise.then(
    (response) => {
      progress.symbolResponse = response;
      if (response.hitCount > 0) {
        emitProgress();
      }
      return response;
    },
    (reason) => {
      appendFailureMessage(progress.failures, reason);
      throw reason;
    },
  );
  const trackedAttachmentPromise = attachmentPromise.then(
    (response) => {
      progress.attachmentResponse = response;
      if (response.hitCount > 0) {
        emitProgress();
      }
      return response;
    },
    (reason) => {
      appendFailureMessage(progress.failures, reason);
      throw reason;
    },
  );

  const settled = await Promise.allSettled([
    trackedKnowledgePromise,
    trackedCodePromise,
    trackedAstPromise,
    trackedReferencePromise,
    trackedSymbolPromise,
    trackedAttachmentPromise,
  ]);
  settled
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .forEach((result) => {
      appendFailureMessage(progress.failures, result.reason);
    });
  const failures = progress.failures;

  if (failures.length === settled.length) {
    throw new Error(failures[0] || "Search failed");
  }

  const knowledgeResponse =
    progress.knowledgeResponse ??
    createFallbackKnowledgeResponse(queryToSearch, "hybrid_search", "hybrid");
  const codeOutcome = repoFilter ? progress.codeOutcome : null;
  const codeResponse =
    !repoFilter && progress.codeResponse
      ? progress.codeResponse
      : createFallbackKnowledgeResponse(trimmedQuery, "code_search", "code_search");
  const astResponse = progress.astResponse ?? createFallbackAstResponse(queryToSearch);
  const referenceResponse =
    progress.referenceResponse ?? createFallbackReferenceResponse(queryToSearch);
  const symbolResponse = progress.symbolResponse ?? createFallbackSymbolResponse(queryToSearch);
  const attachmentResponse =
    progress.attachmentResponse ?? createFallbackAttachmentResponse(queryToSearch);

  return buildAllModeOutcome({
    queryToSearch,
    knowledgeResponse,
    codeResponse,
    codeOutcome: codeOutcome as SearchExecutionOutcome | null,
    astResponse,
    referenceResponse,
    symbolResponse,
    attachmentResponse,
    failures,
  });
}
