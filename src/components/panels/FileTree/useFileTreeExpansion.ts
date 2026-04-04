import { useCallback, useEffect } from "react";
import { useEditorStore } from "../../../stores";
import type { FileNode } from "./types";

export function useFileTreeExpansion(treeData: FileNode[]) {
  const { expandedPaths: storeExpandedPaths, setExpandedPaths: storeSetExpandedPaths } =
    useEditorStore();
  const expandedPaths = new Set(storeExpandedPaths);

  useEffect(() => {
    if (treeData.length === 0) {
      return;
    }
    if (useEditorStore.getState().expandedPaths.length === 0) {
      storeSetExpandedPaths(treeData.map((node) => node.path));
    }
  }, [storeSetExpandedPaths, treeData]);

  const toggleExpand = useCallback(
    (path: string) => {
      const current = new Set(useEditorStore.getState().expandedPaths);
      if (current.has(path)) {
        current.delete(path);
      } else {
        current.add(path);
      }
      storeSetExpandedPaths(Array.from(current));
    },
    [storeSetExpandedPaths],
  );

  return {
    expandedPaths,
    toggleExpand,
  };
}
