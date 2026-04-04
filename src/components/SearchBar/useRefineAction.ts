import { useState, useCallback } from "react";
import { api } from "../../api";
import type { SearchResult } from "./types";

export function useRefineAction() {
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);

  const refineEntity = useCallback(async (result: SearchResult, userHints?: string) => {
    if (!result.codeRepo) {
      setRefinementError("No repository associated with this entity");
      return null;
    }

    setIsRefining(true);
    setRefinementError(null);

    try {
      const response = await api.refineEntityDoc({
        repo_id: result.codeRepo,
        entity_id: result.symbolId, // Using symbolId as the stable entity identifier
        user_hints: userHints,
      });
      return response;
    } catch (err) {
      setRefinementError(err instanceof Error ? err.message : "Refinement failed");
      return null;
    } finally {
      setIsRefining(false);
    }
  }, []);

  return {
    isRefining,
    refinementError,
    refineEntity,
  };
}
