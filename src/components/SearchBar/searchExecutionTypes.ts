import type { RepoOverviewFacet } from "./repoOverviewQueryBuilder";
import type { SearchResult } from "./types";

export type SearchExecutionMode =
  | "all"
  | "knowledge"
  | "symbol"
  | "ast"
  | "reference"
  | "attachment"
  | "code";

export interface SearchMeta {
  query: string;
  hitCount: number;
  selectedMode?: string;
  searchMode?: string;
  graphConfidenceScore?: number;
  intent?: string;
  intentConfidence?: number;
  partial?: boolean;
  indexingState?: string;
  pendingRepos?: string[];
  skippedRepos?: string[];
  runtimeWarning?: string;
  repoFallbackFacet?: string;
  repoFallbackFromQuery?: string;
  repoFallbackToQuery?: string;
}

export interface SearchExecutionOutcome {
  results: SearchResult[];
  meta: SearchMeta;
}

export interface SearchExecutionOptions {
  repoFilter?: string;
  repoFacet?: RepoOverviewFacet | null;
}
