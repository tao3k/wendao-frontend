import { executeAllModeSearch } from './searchExecutionAllMode';
import { executeCodeModeSearch } from './searchExecutionCodeMode';
import { executeSimpleSearchMode } from './searchExecutionSimpleModes';
import type {
  SearchExecutionMode,
  SearchExecutionOptions,
  SearchExecutionOutcome,
} from './searchExecutionTypes';

export async function executeSearchQuery(
  queryToSearch: string,
  mode: SearchExecutionMode,
  options: SearchExecutionOptions = {}
): Promise<SearchExecutionOutcome> {
  if (mode === 'code') {
    return executeCodeModeSearch(queryToSearch, options);
  }

  if (mode === 'all') {
    return executeAllModeSearch(queryToSearch, options);
  }

  return executeSimpleSearchMode(queryToSearch, mode);
}
