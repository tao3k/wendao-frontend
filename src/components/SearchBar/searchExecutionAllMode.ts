import type {
  AttachmentSearchResponse,
  AstSearchResponse,
  ReferenceSearchResponse,
  SearchResponse,
  SymbolSearchResponse,
} from '../../api';
import { api } from '../../api';
import { errorMessage } from './searchResultNormalization';
import {
  buildAllModeOutcome,
  createFallbackAttachmentResponse,
  createFallbackAstResponse,
  createFallbackKnowledgeResponse,
  createFallbackReferenceResponse,
  createFallbackSymbolResponse,
} from './searchExecutionAllModeHelpers';
import type { SearchExecutionOutcome } from './searchExecutionTypes';

export async function executeAllModeSearch(queryToSearch: string): Promise<SearchExecutionOutcome> {
  const settled = await Promise.allSettled([
    api.searchKnowledge(queryToSearch, 10, { intent: 'hybrid_search' }),
    api.searchKnowledge(queryToSearch, 10, { intent: 'code_search' }),
    api.searchAst(queryToSearch, 10),
    api.searchReferences(queryToSearch, 10),
    api.searchSymbols(queryToSearch, 10),
    api.searchAttachments(queryToSearch, 10),
  ]);
  const failures = settled
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => errorMessage(result.reason));

  if (failures.length === settled.length) {
    throw new Error(failures[0] || 'Search failed');
  }

  const knowledgeResponse =
    settled[0].status === 'fulfilled'
      ? settled[0].value
      : createFallbackKnowledgeResponse(queryToSearch, 'hybrid_search', 'hybrid');
  const codeResponse =
    settled[1].status === 'fulfilled'
      ? settled[1].value
      : createFallbackKnowledgeResponse(queryToSearch, 'code_search', 'code_search');
  const astResponse =
    settled[2].status === 'fulfilled'
      ? settled[2].value
      : createFallbackAstResponse(queryToSearch);
  const referenceResponse =
    settled[3].status === 'fulfilled'
      ? settled[3].value
      : createFallbackReferenceResponse(queryToSearch);
  const symbolResponse =
    settled[4].status === 'fulfilled'
      ? settled[4].value
      : createFallbackSymbolResponse(queryToSearch);
  const attachmentResponse =
    settled[5].status === 'fulfilled'
      ? settled[5].value
      : createFallbackAttachmentResponse(queryToSearch);

  return buildAllModeOutcome({
    knowledgeResponse,
    codeResponse,
    astResponse,
    referenceResponse,
    symbolResponse,
    attachmentResponse,
    failures,
  });
}
