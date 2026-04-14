import { useState, useCallback } from "react";
import { api } from "../../api";

interface RefineEntityParams {
  repoId: string;
  entityId: string;
  userHints?: string;
}

export function useRefineAction() {
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);

  const refineEntity = useCallback(async ({ repoId, entityId, userHints }: RefineEntityParams) => {
    if (!repoId.trim()) {
      setRefinementError("No repository associated with this entity");
      return null;
    }
    if (!entityId.trim()) {
      setRefinementError("No entity identifier associated with this entity");
      return null;
    }

    setIsRefining(true);
    setRefinementError(null);

    try {
      const response = await api.refineEntityDoc({
        repo_id: repoId,
        entity_id: entityId,
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
