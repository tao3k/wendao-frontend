import React from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

const IMAGE_PREVIEW_DOUBLE_CLICK_CONFIG = {
  mode: "zoomIn",
  step: 1.6,
} as const;
const IMAGE_PREVIEW_PINCH_CONFIG = {
  step: 4,
} as const;
const IMAGE_PREVIEW_WHEEL_CONFIG = {
  step: 0.12,
} as const;

export interface ImagePreviewSurfaceProps {
  className: string;
  label: string;
  resolvedUrl: string;
  testId: string;
  title?: string;
}

interface ImagePreviewActionButtonProps {
  action: "zoomOut" | "zoomIn" | "center" | "reset";
  centerView: (scale?: number) => void;
  resetTransform: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

function resolveImagePreviewActionLabel(action: ImagePreviewActionButtonProps["action"]): string {
  switch (action) {
    case "zoomOut":
      return "Zoom out";
    case "zoomIn":
      return "Zoom in";
    case "center":
      return "Center";
    case "reset":
      return "Reset";
    default:
      return action;
  }
}

function ImagePreviewActionButton({
  action,
  centerView,
  resetTransform,
  zoomIn,
  zoomOut,
}: ImagePreviewActionButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    if (action === "zoomOut") {
      zoomOut();
      return;
    }
    if (action === "zoomIn") {
      zoomIn();
      return;
    }
    if (action === "center") {
      centerView(1);
      return;
    }
    resetTransform();
  }, [action, centerView, resetTransform, zoomIn, zoomOut]);

  return (
    <button className="media-preview__image-button" onClick={handleClick} type="button">
      {resolveImagePreviewActionLabel(action)}
    </button>
  );
}

export function ImagePreviewSurface({
  className,
  label,
  resolvedUrl,
  testId,
  title,
}: ImagePreviewSurfaceProps): React.ReactElement {
  return (
    <TransformWrapper
      key={resolvedUrl}
      centerOnInit
      doubleClick={IMAGE_PREVIEW_DOUBLE_CLICK_CONFIG}
      limitToBounds={false}
      maxScale={12}
      minScale={0.2}
      pinch={IMAGE_PREVIEW_PINCH_CONFIG}
      wheel={IMAGE_PREVIEW_WHEEL_CONFIG}
    >
      {({ centerView, resetTransform, zoomIn, zoomOut }) => (
        <div className={`${className} media-preview__image-shell`} data-testid={testId}>
          <div className="media-preview__image-toolbar">
            <div className="media-preview__image-meta">
              <span className="media-preview__image-label">{label}</span>
              <span className="media-preview__image-hint">
                Wheel or pinch to zoom. Drag to pan.
              </span>
            </div>
            <div className="media-preview__image-actions">
              <ImagePreviewActionButton
                action="zoomOut"
                centerView={centerView}
                resetTransform={resetTransform}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
              />
              <ImagePreviewActionButton
                action="zoomIn"
                centerView={centerView}
                resetTransform={resetTransform}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
              />
              <ImagePreviewActionButton
                action="center"
                centerView={centerView}
                resetTransform={resetTransform}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
              />
              <ImagePreviewActionButton
                action="reset"
                centerView={centerView}
                resetTransform={resetTransform}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
              />
              <a
                className="media-preview__fallback-link media-preview__fallback-link--toolbar"
                href={resolvedUrl}
                rel="noreferrer noopener"
                target="_blank"
              >
                Open image
              </a>
            </div>
          </div>
          <div className="media-preview__image-stage">
            <TransformComponent
              contentClass="media-preview__image-transform-content"
              wrapperClass="media-preview__image-transform-wrapper"
            >
              <img
                alt={label}
                className="media-preview__image-element"
                decoding="async"
                draggable={false}
                loading="lazy"
                src={resolvedUrl}
                title={title ?? label}
              />
            </TransformComponent>
          </div>
        </div>
      )}
    </TransformWrapper>
  );
}
