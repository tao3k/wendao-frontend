import { useCallback, useEffect, useState } from "react";
import { api } from "../../../api";
import type { RepoIndexStatus } from "../../statusBar/types";
import {
  startRepoIndexStatusPolling,
  toRepoIndexStatusSnapshot,
} from "./repoIndexStatus";
import { buildTree } from "./treeModel";
import type { FileNode, FileTreeLocale } from "./types";

interface UseFileTreeRuntimeOptions {
  locale: FileTreeLocale;
  emptyProjectHint: string;
}

export function useFileTreeRuntime({ locale, emptyProjectHint }: UseFileTreeRuntimeOptions) {
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repoIndexStatus, setRepoIndexStatus] = useState<RepoIndexStatus | null>(null);
  const [linkGraphOnlyProjectIds, setLinkGraphOnlyProjectIds] = useState<string[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  const retryGatewaySync = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  const refreshRepoIndexStatus = useCallback(async () => {
    const status = await api.getRepoIndexStatus();
    setRepoIndexStatus(toRepoIndexStatusSnapshot(status, { linkGraphOnlyProjectIds }));
  }, [linkGraphOnlyProjectIds]);

  useEffect(() => {
    let cancelled = false;
    let stopRepoIndexPolling: (() => void) | null = null;

    const loadTree = async () => {
      setIsLoading(true);
      setError(null);
      setRepoIndexStatus(null);
      setLinkGraphOnlyProjectIds([]);
      try {
        const linkGraphOnlyProjects: string[] = [];
        setLinkGraphOnlyProjectIds(linkGraphOnlyProjects);
        stopRepoIndexPolling = startRepoIndexStatusPolling(
          (status) => {
            if (!cancelled) {
              setRepoIndexStatus(status);
            }
          },
          undefined,
          { linkGraphOnlyProjectIds: linkGraphOnlyProjects },
        );

        const vfsResult = await api.scanVfs();
        const tree = buildTree(
          vfsResult.entries.map((entry) => ({
            path: entry.path,
            name: entry.name,
            isDir: entry.isDir,
            category: entry.category,
            size: entry.size,
            modified: entry.modified,
            hasFrontmatter: entry.hasFrontmatter,
            contentType: entry.contentType ?? undefined,
            projectName: entry.projectName ?? undefined,
            rootLabel: entry.rootLabel ?? undefined,
            projectRoot: entry.projectRoot ?? undefined,
            projectDirs: entry.projectDirs ?? undefined,
            wendaoId: entry.wendaoId ?? undefined,
          })),
          locale,
          [],
          emptyProjectHint,
        );
        if (cancelled) {
          return;
        }
        setTreeData(tree);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setRepoIndexStatus(null);
        setLinkGraphOnlyProjectIds([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load file tree");
        setTreeData([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadTree();
    return () => {
      cancelled = true;
      stopRepoIndexPolling?.();
    };
  }, [emptyProjectHint, locale, reloadToken]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const handleFocus = () => {
      retryGatewaySync();
    };
    const retryTimer = window.setTimeout(() => {
      retryGatewaySync();
    }, 2500);

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(retryTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [error, retryGatewaySync]);

  return {
    error,
    isLoading,
    refreshRepoIndexStatus,
    repoIndexStatus,
    retryGatewaySync,
    treeData,
  };
}
