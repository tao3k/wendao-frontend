import type { SearchResultSection } from "../../searchResultSections";
import {
  buildVirtualizedSearchRows,
  type SearchResultsVirtualRow,
} from "./buildVirtualizedSearchRows";

export interface SearchResultsListModel {
  rows: SearchResultsVirtualRow[];
  visibleResultCount: number;
}

export function buildSearchResultsListModel(
  visibleSections: SearchResultSection[],
): SearchResultsListModel {
  return {
    rows: buildVirtualizedSearchRows(visibleSections),
    visibleResultCount: visibleSections.reduce(
      (accumulator, section) => accumulator + section.hits.length,
      0,
    ),
  };
}
