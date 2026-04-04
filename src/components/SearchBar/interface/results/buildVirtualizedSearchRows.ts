import type { SearchResult } from "../../types";
import type { SearchResultSection } from "../../searchResultSections";
import { getSearchResultIdentity } from "../../searchResultIdentity";

export interface SearchResultsSectionRow {
  type: "section";
  key: string;
  title: string;
  hitCount: number;
}

export interface SearchResultsHitRow {
  type: "result";
  key: string;
  displayIndex: number;
  result: SearchResult;
}

export type SearchResultsVirtualRow = SearchResultsSectionRow | SearchResultsHitRow;

export function buildVirtualizedSearchRows(
  visibleSections: SearchResultSection[],
): SearchResultsVirtualRow[] {
  const rows: SearchResultsVirtualRow[] = [];
  let displayIndex = 0;

  visibleSections.forEach((section) => {
    rows.push({
      type: "section",
      key: `section:${section.key}`,
      title: section.title,
      hitCount: section.hits.length,
    });

    section.hits.forEach((result) => {
      rows.push({
        type: "result",
        key: `result:${getSearchResultIdentity(result)}`,
        displayIndex,
        result,
      });
      displayIndex += 1;
    });
  });

  return rows;
}
