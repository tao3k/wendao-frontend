import { useEffect, useState } from "react";
import { api } from "../../api";
import { isSearchOnlyRepoProject } from "./repoProjectConfig";
import type { SearchScope } from "./types";

interface UseRepoSyncStatusParams {
  isOpen: boolean;
  scope: SearchScope;
  repoFilter?: string;
}

export interface RepoSyncStatusSnapshot {
  repoId: string;
  healthState: string;
  stalenessState: string;
  driftState: string;
}

export function useRepoSyncStatus({ isOpen, scope, repoFilter }: UseRepoSyncStatusParams): {
  repoSyncStatus: RepoSyncStatusSnapshot | null;
} {
  const [repoSyncStatus, setRepoSyncStatus] = useState<RepoSyncStatusSnapshot | null>(null);

  useEffect(() => {
    const normalizedRepo = repoFilter?.trim();
    if (!isOpen || scope !== "code" || !normalizedRepo || isSearchOnlyRepoProject(normalizedRepo)) {
      setRepoSyncStatus(null);
      return;
    }

    let cancelled = false;

    const loadSyncStatus = async () => {
      try {
        const response = await api.getRepoSync(normalizedRepo, "status");
        if (cancelled) {
          return;
        }

        setRepoSyncStatus({
          repoId: normalizedRepo,
          healthState: response.healthState ?? "unknown",
          stalenessState: response.stalenessState ?? "unknown",
          driftState: response.driftState ?? "unknown",
        });
      } catch {
        if (cancelled) {
          return;
        }
        setRepoSyncStatus({
          repoId: normalizedRepo,
          healthState: "unavailable",
          stalenessState: "unknown",
          driftState: "unknown",
        });
      }
    };

    void loadSyncStatus();

    return () => {
      cancelled = true;
    };
  }, [isOpen, repoFilter, scope]);

  return { repoSyncStatus };
}
