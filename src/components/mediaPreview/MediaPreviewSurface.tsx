import React, { Suspense, lazy } from "react";
import {
  inferMediaContentType,
  inferMediaPreviewKind,
  resolveMediaPreviewUrl,
  resolveRelativeVfsResourcePath,
} from "./model";
import "./MediaPreviewSurface.css";

const LazyImagePreviewSurface = lazy(async () => {
  const module = await import("./ImagePreviewSurface");
  return {
    default: module.ImagePreviewSurface,
  };
});

const LazyVideoAudioPreviewSurface = lazy(async () => {
  const module = await import("./VideoAudioPreviewSurface");
  return {
    default: module.VideoAudioPreviewSurface,
  };
});

const LazyPdfPreviewSurface = lazy(async () => {
  const module = await import("./PdfPreviewSurface");
  return {
    default: module.PdfPreviewSurface,
  };
});

export interface MediaPreviewSurfaceProps {
  alt?: string;
  contentType?: string | null;
  mode?: "inline" | "standalone";
  sourcePath?: string;
  target: string;
  testId?: string;
  title?: string;
}

function resolveMediaLabel(target: string, alt?: string): string {
  const preferredLabel = alt?.trim();
  if (preferredLabel) {
    return preferredLabel;
  }

  const normalizedTarget = target.trim().replace(/\\/g, "/");
  const lastSegment = normalizedTarget.split("/").pop()?.trim();
  return lastSegment || target.trim() || "media";
}

function buildAssetClassName(kind: string, mode: MediaPreviewSurfaceProps["mode"]): string {
  return [
    "media-preview__asset",
    `media-preview__asset--${kind}`,
    mode === "standalone" ? "media-preview__asset--standalone" : "media-preview__asset--inline",
  ]
    .filter(Boolean)
    .join(" ");
}

function renderAssetLoadingShell(
  className: string,
  dataTestId: string,
  message: string,
): React.ReactElement {
  return (
    <div
      className={`${className} media-preview__pdf-loading`}
      data-testid={`${dataTestId}-loading`}
    >
      <div className="media-preview__pdf-status">{message}</div>
    </div>
  );
}

export function resolveMediaLinkHref(target: string, sourcePath?: string): string {
  const resolvedTarget = resolveRelativeVfsResourcePath(target, sourcePath);
  if (!inferMediaPreviewKind(resolvedTarget)) {
    return target;
  }
  return resolveMediaPreviewUrl(target, sourcePath);
}

export const MediaPreviewSurface = React.memo(function MediaPreviewSurface({
  alt,
  contentType = null,
  mode = "inline",
  sourcePath,
  target,
  testId,
  title,
}: MediaPreviewSurfaceProps): React.ReactElement | null {
  const kind = inferMediaPreviewKind(target, contentType);
  if (!kind) {
    return null;
  }

  const label = resolveMediaLabel(target, alt);
  const resolvedUrl = resolveMediaPreviewUrl(target, sourcePath);
  const resolvedContentType = inferMediaContentType(target, contentType) ?? undefined;
  const assetClassName = buildAssetClassName(kind, mode);
  const dataTestId = testId ?? `media-preview-${kind}`;

  let asset: React.ReactElement;
  if (kind === "image") {
    asset =
      mode === "standalone" ? (
        <Suspense
          fallback={renderAssetLoadingShell(assetClassName, dataTestId, "Loading image viewer…")}
        >
          <LazyImagePreviewSurface
            className={assetClassName}
            label={label}
            resolvedUrl={resolvedUrl}
            testId={dataTestId}
            title={title}
          />
        </Suspense>
      ) : (
        <img
          alt={label}
          className={assetClassName}
          data-testid={dataTestId}
          loading="lazy"
          src={resolvedUrl}
          title={title}
        />
      );
  } else if (kind === "video") {
    asset =
      mode === "standalone" ? (
        <Suspense
          fallback={renderAssetLoadingShell(assetClassName, dataTestId, "Loading video player…")}
        >
          <LazyVideoAudioPreviewSurface
            className={assetClassName}
            kind="video"
            label={label}
            resolvedContentType={resolvedContentType}
            resolvedUrl={resolvedUrl}
            testId={dataTestId}
            title={title}
          />
        </Suspense>
      ) : (
        <video
          aria-label={label}
          className={assetClassName}
          controls
          data-testid={dataTestId}
          preload="metadata"
        >
          <source src={resolvedUrl} type={resolvedContentType} />
          <track kind="captions" label={`${label} captions`} />
          {label}
        </video>
      );
  } else if (kind === "audio") {
    asset =
      mode === "standalone" ? (
        <Suspense
          fallback={renderAssetLoadingShell(assetClassName, dataTestId, "Loading audio player…")}
        >
          <LazyVideoAudioPreviewSurface
            className={assetClassName}
            kind="audio"
            label={label}
            resolvedContentType={resolvedContentType}
            resolvedUrl={resolvedUrl}
            testId={dataTestId}
            title={title}
          />
        </Suspense>
      ) : (
        <audio
          aria-label={label}
          className={assetClassName}
          controls
          data-testid={dataTestId}
          preload="metadata"
        >
          <source src={resolvedUrl} type={resolvedContentType} />
          <track kind="captions" label={`${label} captions`} />
          {label}
        </audio>
      );
  } else {
    asset =
      mode === "inline" ? (
        <object
          aria-label={label}
          className={assetClassName}
          data={resolvedUrl}
          data-testid={dataTestId}
          title={title ?? label}
          type={resolvedContentType ?? "application/pdf"}
        >
          <a
            className="media-preview__fallback-link"
            href={resolvedUrl}
            rel="noreferrer noopener"
            target="_blank"
          >
            {label}
          </a>
        </object>
      ) : (
        <Suspense
          fallback={renderAssetLoadingShell(assetClassName, dataTestId, "Loading PDF viewer…")}
        >
          <LazyPdfPreviewSurface
            className={assetClassName}
            label={label}
            mode={mode}
            resolvedUrl={resolvedUrl}
            testId={dataTestId}
            title={title}
          />
        </Suspense>
      );
  }

  if (mode === "standalone") {
    return <div className="media-preview media-preview--standalone">{asset}</div>;
  }

  return asset;
});
