import type { RepoDiagnosticsFilter } from "./repoDiagnostics/state";

export const REPO_DIAGNOSTICS_HASH_PREFIX = "#repo-diagnostics";

export interface RepoDiagnosticsHashState {
  isRepoDiagnosticsPage: boolean;
  hasStateParams: boolean;
  filter: RepoDiagnosticsFilter;
  unsupportedReason: string | null;
  failedReason: string | null;
  selectedRepoId: string | null;
}

function normalizeFilter(value: string | null): RepoDiagnosticsFilter {
  return value === "unsupported" || value === "failed" || value === "all" ? value : "all";
}

function splitDiagnosticsHash(hash: string): { pathname: string; search: string } {
  const trimmed = hash.trim();
  const [pathname, ...searchParts] = trimmed.split("?");
  return {
    pathname,
    search: searchParts.join("?"),
  };
}

export function isRepoDiagnosticsHash(hash: string): boolean {
  return splitDiagnosticsHash(hash).pathname === REPO_DIAGNOSTICS_HASH_PREFIX;
}

export function parseRepoDiagnosticsHash(hash: string): RepoDiagnosticsHashState {
  const { pathname, search } = splitDiagnosticsHash(hash);
  if (pathname !== REPO_DIAGNOSTICS_HASH_PREFIX) {
    return {
      isRepoDiagnosticsPage: false,
      hasStateParams: false,
      filter: "all",
      unsupportedReason: null,
      failedReason: null,
      selectedRepoId: null,
    };
  }

  const params = new URLSearchParams(search);
  const unsupportedReason = params.get("unsupportedReason")?.trim() ?? "";
  const failedReason = params.get("failedReason")?.trim() ?? "";
  const selectedRepoId = params.get("repo")?.trim() ?? "";

  return {
    isRepoDiagnosticsPage: true,
    hasStateParams: params.size > 0,
    filter: normalizeFilter(params.get("filter")),
    unsupportedReason: unsupportedReason.length > 0 ? unsupportedReason : null,
    failedReason: failedReason.length > 0 ? failedReason : null,
    selectedRepoId: selectedRepoId.length > 0 ? selectedRepoId : null,
  };
}

export function buildRepoDiagnosticsHash(state: {
  filter: RepoDiagnosticsFilter;
  unsupportedReason: string | null;
  failedReason: string | null;
  selectedRepoId: string | null;
}): string {
  const params = new URLSearchParams();
  const effectiveFilter =
    state.unsupportedReason !== null
      ? "unsupported"
      : state.failedReason !== null
        ? "failed"
        : state.filter;

  if (effectiveFilter !== "all") {
    params.set("filter", effectiveFilter);
  }
  if (state.unsupportedReason !== null) {
    params.set("unsupportedReason", state.unsupportedReason);
  }
  if (state.failedReason !== null) {
    params.set("failedReason", state.failedReason);
  }
  if (state.selectedRepoId !== null) {
    params.set("repo", state.selectedRepoId);
  }

  const search = params.toString();
  return search.length > 0
    ? `${REPO_DIAGNOSTICS_HASH_PREFIX}?${search}`
    : REPO_DIAGNOSTICS_HASH_PREFIX;
}
