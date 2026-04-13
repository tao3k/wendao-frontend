import type { SearchResult } from "./types";
import { normalizePathSegments } from "../../utils/selectionPath";

export interface SearchResultMetaPill {
  kind:
    | "source"
    | "language"
    | "kind"
    | "line"
    | "repo"
    | "target"
    | "audit"
    | "verification"
    | "backlinks"
    | "projection";
  label: string;
}

function asNonEmptyText(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function appendPill(
  pills: SearchResultMetaPill[],
  kind: SearchResultMetaPill["kind"],
  label: string | null,
): void {
  if (!label) {
    return;
  }
  pills.push({ kind, label });
}

function resolveBacklinkCount(result: SearchResult): number {
  if ((result.implicitBacklinkItems?.length ?? 0) > 0) {
    return result.implicitBacklinkItems?.length ?? 0;
  }
  return result.implicitBacklinks?.length ?? 0;
}

export function resolveHierarchyHint(
  result: Pick<SearchResult, "hierarchy" | "hierarchicalUri">,
): string | null {
  const segments =
    result.hierarchy
      ?.map((segment) => normalizePathSegments(segment).trim())
      .filter((segment) => segment.length > 0) ?? [];
  if (segments.length > 0) {
    return segments.join(" / ");
  }
  return asNonEmptyText(result.hierarchicalUri);
}

export function buildCodeMetaPills(
  result: SearchResult,
  lineRange: string | null,
): SearchResultMetaPill[] {
  const pills: SearchResultMetaPill[] = [];
  if (result.searchSource === "repo-intelligence") {
    appendPill(pills, "source", "repo-intel");
  }
  appendPill(pills, "language", asNonEmptyText(result.codeLanguage));
  appendPill(pills, "kind", asNonEmptyText(result.codeKind));
  appendPill(pills, "line", asNonEmptyText(lineRange ?? undefined));
  appendPill(pills, "repo", asNonEmptyText(result.codeRepo));
  appendPill(pills, "target", result.docTarget ? `target:${result.docTarget.kind}` : null);

  const auditStatus = asNonEmptyText(result.auditStatus);
  const verificationState = asNonEmptyText(result.verificationState);
  appendPill(pills, "audit", auditStatus ? `audit:${auditStatus}` : null);
  appendPill(
    pills,
    "verification",
    verificationState && verificationState !== auditStatus ? `verify:${verificationState}` : null,
  );

  const backlinkCount = resolveBacklinkCount(result);
  if (backlinkCount > 0) {
    appendPill(pills, "backlinks", `backlinks:${backlinkCount}`);
  }
  const projectionCount = result.projectionPageIds?.length ?? 0;
  if (projectionCount > 0) {
    appendPill(pills, "projection", `projection:${projectionCount}`);
  }

  return pills;
}
