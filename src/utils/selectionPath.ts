export interface SelectionPathLike {
  path: string;
  category: string;
  projectName?: string;
  rootLabel?: string;
}

const INTERNAL_WORKSPACE_MARKER = ".data/wendao-frontend/";

export function normalizePathSegments(path: string): string {
  const normalizedPath = path.trim().replace(/\\/g, "/");
  if (normalizedPath.length === 0 || normalizedPath.includes("://")) {
    return normalizedPath;
  }

  const fragmentIndex = normalizedPath.indexOf("#");
  const pathBody = fragmentIndex >= 0 ? normalizedPath.slice(0, fragmentIndex) : normalizedPath;
  const pathSuffix = fragmentIndex >= 0 ? normalizedPath.slice(fragmentIndex) : "";
  const hasLeadingSlash = pathBody.startsWith("/");
  const hasTrailingSlash = pathBody.endsWith("/") && pathBody.length > 1;
  const normalizedSegments = pathBody
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".");
  const normalizedBody = `${hasLeadingSlash ? "/" : ""}${normalizedSegments.join("/")}`;

  if (normalizedBody.length === 0) {
    return pathSuffix;
  }

  return `${normalizedBody}${hasTrailingSlash ? "/" : ""}${pathSuffix}`;
}

function stripInternalWorkspacePrefix(path: string): string {
  const normalizedPath = path.trim().replace(/\\/g, "/");
  if (normalizedPath.length === 0) {
    return normalizedPath;
  }

  const markerIndex = normalizedPath.indexOf(INTERNAL_WORKSPACE_MARKER);
  if (markerIndex >= 0) {
    return normalizePathSegments(
      normalizedPath.slice(markerIndex + INTERNAL_WORKSPACE_MARKER.length).replace(/^\/+/, ""),
    ).replace(/^\/+/, "");
  }

  return normalizePathSegments(normalizedPath).replace(/^\/+/, "");
}

function isSemanticGraphNodeId(path: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(path);
}

function normalizeComparableSelectionPath(path: string): string {
  return stripInternalWorkspacePrefix(path).trim();
}

export function preferMoreCanonicalSelectionPath(
  resultPath: string,
  navigationPath?: string,
): string {
  const trimmedResultPath = resultPath.trim();
  const trimmedNavigationPath = navigationPath?.trim() ?? "";
  if (!trimmedNavigationPath) {
    return trimmedResultPath;
  }
  if (!trimmedResultPath) {
    return trimmedNavigationPath;
  }

  const normalizedResultPath = normalizeComparableSelectionPath(trimmedResultPath);
  const normalizedNavigationPath = normalizeComparableSelectionPath(trimmedNavigationPath);
  if (!normalizedResultPath) {
    return trimmedNavigationPath;
  }
  if (!normalizedNavigationPath || normalizedNavigationPath === normalizedResultPath) {
    return trimmedNavigationPath;
  }
  if (isSemanticGraphNodeId(normalizedNavigationPath)) {
    return trimmedNavigationPath;
  }
  if (normalizedResultPath.endsWith(`/${normalizedNavigationPath}`)) {
    return trimmedResultPath;
  }

  return trimmedNavigationPath;
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
