export interface SelectionPathLike {
  path: string;
  category: string;
  projectName?: string;
  rootLabel?: string;
}

const INTERNAL_WORKSPACE_MARKER = ".data/wendao-frontend/";

function stripInternalWorkspacePrefix(path: string): string {
  const normalizedPath = path.trim().replace(/\\/g, "/");
  if (normalizedPath.length === 0) {
    return normalizedPath;
  }

  const markerIndex = normalizedPath.indexOf(INTERNAL_WORKSPACE_MARKER);
  if (markerIndex >= 0) {
    return normalizedPath.slice(markerIndex + INTERNAL_WORKSPACE_MARKER.length).replace(/^\/+/, "");
  }

  return normalizedPath.replace(/^\/+/, "");
}

function isSemanticGraphNodeId(path: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(path);
}

export function normalizeSelectionPathForVfs(selection: SelectionPathLike): string {
  const normalizedPath = stripInternalWorkspacePrefix(selection.path);
  if (normalizedPath.length === 0) {
    return normalizedPath;
  }

  const projectName = selection.projectName?.trim();
  if (!projectName) {
    return normalizedPath;
  }

  if (normalizedPath === projectName || normalizedPath.startsWith(`${projectName}/`)) {
    return normalizedPath;
  }

  return `${projectName}/${normalizedPath.replace(/^\/+/, "")}`;
}

export function normalizeSelectionPathForGraph(selection: SelectionPathLike): string {
  const normalizedPath = stripInternalWorkspacePrefix(selection.path);
  if (normalizedPath.length === 0) {
    return normalizedPath;
  }

  if (isSemanticGraphNodeId(normalizedPath)) {
    return normalizedPath;
  }

  return normalizeSelectionPathForVfs({
    ...selection,
    path: normalizedPath,
  });
}
