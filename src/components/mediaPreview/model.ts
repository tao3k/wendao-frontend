export type MediaPreviewKind = "image" | "video" | "audio" | "pdf";

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  apng: "image/apng",
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};
const IMAGE_EXTENSIONS = new Set(Object.keys(IMAGE_CONTENT_TYPES));
const VIDEO_CONTENT_TYPES: Record<string, string> = {
  avi: "video/x-msvideo",
  m4v: "video/mp4",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  mp4: "video/mp4",
  webm: "video/webm",
};
const VIDEO_EXTENSIONS = new Set(Object.keys(VIDEO_CONTENT_TYPES));
const AUDIO_CONTENT_TYPES: Record<string, string> = {
  aac: "audio/aac",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
};
const AUDIO_EXTENSIONS = new Set(Object.keys(AUDIO_CONTENT_TYPES));
const PDF_EXTENSIONS = new Set(["pdf"]);
const EXTERNAL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

interface SplitResourceSuffixResult {
  path: string;
  suffix: string;
}

function splitResourceSuffix(target: string): SplitResourceSuffixResult {
  const queryIndex = target.indexOf("?");
  const hashIndex = target.indexOf("#");
  const suffixIndex =
    queryIndex >= 0 && hashIndex >= 0
      ? Math.min(queryIndex, hashIndex)
      : Math.max(queryIndex, hashIndex);

  if (suffixIndex < 0) {
    return {
      path: target,
      suffix: "",
    };
  }

  return {
    path: target.slice(0, suffixIndex),
    suffix: target.slice(suffixIndex),
  };
}

function collapseDotSegments(path: string): string {
  const normalized = path.trim().replace(/\\/g, "/");
  if (!normalized) {
    return "";
  }

  const segments = normalized.split("/");
  const collapsed: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (collapsed.length > 0 && collapsed[collapsed.length - 1] !== "..") {
        collapsed.pop();
      }
      continue;
    }
    collapsed.push(segment);
  }

  return collapsed.join("/");
}

function extensionFromTarget(target: string): string | null {
  const { path } = splitResourceSuffix(target.trim());
  const normalized = path.trim().replace(/\\/g, "/");
  const lastSegment = normalized.split("/").pop() ?? "";
  const extensionIndex = lastSegment.lastIndexOf(".");
  if (extensionIndex < 0 || extensionIndex === lastSegment.length - 1) {
    return null;
  }
  return lastSegment.slice(extensionIndex + 1).toLowerCase();
}

export function isLocalVfsResourceTarget(target: string): boolean {
  const trimmed = target.trim();
  return trimmed.length > 0 && !trimmed.startsWith("//") && !EXTERNAL_SCHEME_RE.test(trimmed);
}

export function resolveRelativeVfsResourcePath(target: string, sourcePath?: string): string {
  const trimmed = target.trim();
  if (!trimmed || !isLocalVfsResourceTarget(trimmed)) {
    return trimmed;
  }

  const { path: targetPath, suffix } = splitResourceSuffix(trimmed);
  const normalizedTargetPath = targetPath.replace(/\\/g, "/");
  if (!normalizedTargetPath) {
    return trimmed;
  }

  if (normalizedTargetPath.startsWith("/")) {
    return `${collapseDotSegments(normalizedTargetPath)}${suffix}`.replace(/^\/+/, "");
  }

  const sourceBasePath = sourcePath?.trim() ?? "";
  if (!sourceBasePath || !isLocalVfsResourceTarget(sourceBasePath)) {
    return `${collapseDotSegments(normalizedTargetPath)}${suffix}`;
  }

  const { path: sourceBody } = splitResourceSuffix(sourceBasePath);
  const normalizedSourcePath = sourceBody.replace(/\\/g, "/");
  const slashIndex = normalizedSourcePath.lastIndexOf("/");
  const baseDir = slashIndex >= 0 ? normalizedSourcePath.slice(0, slashIndex + 1) : "";

  return `${collapseDotSegments(`${baseDir}${normalizedTargetPath}`)}${suffix}`;
}

export function inferMediaPreviewKind(
  targetPath?: string | null,
  contentType?: string | null,
): MediaPreviewKind | null {
  const normalizedContentType = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (normalizedContentType.startsWith("image/")) {
    return "image";
  }
  if (normalizedContentType.startsWith("video/")) {
    return "video";
  }
  if (normalizedContentType.startsWith("audio/")) {
    return "audio";
  }
  if (normalizedContentType === "application/pdf") {
    return "pdf";
  }

  const extension = targetPath ? extensionFromTarget(targetPath) : null;
  if (!extension) {
    return null;
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return "audio";
  }
  if (PDF_EXTENSIONS.has(extension)) {
    return "pdf";
  }
  return null;
}

export function inferMediaContentType(
  targetPath?: string | null,
  contentType?: string | null,
): string | null {
  const normalizedContentType = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (inferMediaPreviewKind(targetPath, normalizedContentType) && normalizedContentType) {
    return normalizedContentType;
  }

  const extension = targetPath ? extensionFromTarget(targetPath) : null;
  if (!extension) {
    return null;
  }

  if (extension in IMAGE_CONTENT_TYPES) {
    return IMAGE_CONTENT_TYPES[extension];
  }
  if (extension in VIDEO_CONTENT_TYPES) {
    return VIDEO_CONTENT_TYPES[extension];
  }
  if (extension in AUDIO_CONTENT_TYPES) {
    return AUDIO_CONTENT_TYPES[extension];
  }
  if (PDF_EXTENSIONS.has(extension)) {
    return "application/pdf";
  }

  return null;
}

export function buildVfsRawAssetUrl(path: string): string {
  const { path: targetPath, suffix } = splitResourceSuffix(path.trim());
  return `/api/vfs/raw?path=${encodeURIComponent(targetPath)}${suffix}`;
}

export function resolveMediaPreviewUrl(target: string, sourcePath?: string): string {
  const resolvedTarget = resolveRelativeVfsResourcePath(target, sourcePath);
  if (!isLocalVfsResourceTarget(resolvedTarget)) {
    return resolvedTarget;
  }
  return buildVfsRawAssetUrl(resolvedTarget);
}
