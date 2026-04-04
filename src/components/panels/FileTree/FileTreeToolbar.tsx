import React from "react";
import type { FileTreeCopy } from "./types";

interface FileTreeToolbarProps {
  copy: FileTreeCopy;
  rootCount: number;
}

export function FileTreeToolbar({ copy, rootCount }: FileTreeToolbarProps): JSX.Element {
  return (
    <div className="file-tree-toolbar">
      <span className="file-tree-toolbar-title">{copy.toolbarTitle}</span>
      {rootCount > 0 ? (
        <span className="file-tree-toolbar-count">
          {rootCount} {copy.rootsSuffix}
        </span>
      ) : null}
    </div>
  );
}
