import { isCodeSearchResult } from "../SearchBar/searchResultNormalization";
import type { SearchResult } from "../SearchBar/types";

export function supportsCodeAstPreview(result: SearchResult): boolean {
  return isCodeSearchResult(result);
}
