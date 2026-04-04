import { useSearchBarController } from "../SearchBar/useSearchBarController";
import type {
  UseSearchBarControllerParams,
  SearchBarControllerResult,
} from "../SearchBar/searchBarControllerTypes";

export function useZenSearchMode(params: UseSearchBarControllerParams): SearchBarControllerResult {
  return useSearchBarController(params);
}
