import type { RepoDocCoverageTarget, SearchHit } from "../../api";

export type SearchScope =
  | "all"
  | "document"
  | "knowledge"
  | "tag"
  | "symbol"
  | "ast"
  | "reference"
  | "attachment"
  | "code";
export type SearchSort = "relevance" | "path";
export type ResultCategory =
  | "knowledge"
  | "skill"
  | "tag"
  | "document"
  | "symbol"
  | "ast"
  | "reference"
  | "attachment";
export type UiLocale = "en" | "zh";

export interface SearchSelection {
  path: string;
  category: string;
  projectName?: string;
  rootLabel?: string;
  line?: number;
  lineEnd?: number;
  column?: number;
  graphPath?: string;
}

export type SearchSelectionActionDecision = void | boolean;
export type SearchSelectionActionResult =
  | SearchSelectionActionDecision
  | Promise<SearchSelectionActionDecision>;
export type SearchSelectionAction = (selection: SearchSelection) => SearchSelectionActionResult;

export interface SearchResult extends SearchHit {
  category: ResultCategory;
  projectName?: string | null;
  rootLabel?: string | null;
  previewPath?: string;
  line?: number | null;
  lineEnd?: number | null;
  column?: number | null;
  projectionPageIds?: string[];
  navigationTarget: SearchSelection;
  codeLanguage?: string;
  codeKind?: string;
  codeRepo?: string;
  searchSource?: "search-index" | "repo-intelligence";
  docTarget?: RepoDocCoverageTarget;
  verification_state?: "verified" | "unverified" | "unknown";
}

export interface SearchBarCopy {
  placeholder: string;
  searching: string;
  suggestions: string;
  toggleSuggestions: string;
  relevance: string;
  path: string;
  totalResults: string;
  mode: string;
  confidence: string;
  fallback: string;
  fallbackRestore: string;
  repoSync: string;
  repoIndex: string;
  repoIndexModules: string;
  repoIndexSymbols: string;
  repoIndexExamples: string;
  repoIndexDocs: string;
  freshness: string;
  drift: string;
  scope: string;
  sort: string;
  attachments: string;
  noResultsPrefix: string;
  project: string;
  root: string;
  preview: string;
  graph: string;
  refs: string;
  definition: string;
  open: string;
  openInGraph: string;
  graphUnavailable: string;
  openReferences: string;
  referencesUnavailable: string;
  navigate: string;
  autocomplete: string;
  select: string;
  close: string;
  runtimeSearching: string;
  codeFilterOnlyHint: string;
  codeQuickFilters: string;
  codeQuickExamples: string;
  codeQuickScenarios: string;
}
