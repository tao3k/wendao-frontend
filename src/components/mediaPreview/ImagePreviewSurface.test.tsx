import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImagePreviewSurface } from "./ImagePreviewSurface";

const imagePreviewMockState = vi.hoisted(() => ({
  centerViewSpy: vi.fn(),
  resetTransformSpy: vi.fn(),
  zoomInSpy: vi.fn(),
  zoomOutSpy: vi.fn(),
}));

vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({
    children,
  }: {
    children:
      | React.ReactNode
      | ((tools: {
          centerView: (scale?: number) => void;
          resetTransform: () => void;
          zoomIn: () => void;
          zoomOut: () => void;
        }) => React.ReactNode);
  }) => (
    <div data-testid="transform-wrapper">
      {typeof children === "function"
        ? children({
            centerView: imagePreviewMockState.centerViewSpy,
            resetTransform: imagePreviewMockState.resetTransformSpy,
            zoomIn: imagePreviewMockState.zoomInSpy,
            zoomOut: imagePreviewMockState.zoomOutSpy,
          })
        : children}
    </div>
  ),
  TransformComponent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="transform-component">{children}</div>
  ),
}));

describe("ImagePreviewSurface", () => {
  beforeEach(() => {
    imagePreviewMockState.centerViewSpy.mockClear();
    imagePreviewMockState.resetTransformSpy.mockClear();
    imagePreviewMockState.zoomInSpy.mockClear();
    imagePreviewMockState.zoomOutSpy.mockClear();
  });

  it("renders a standalone image viewer with mature zoom controls", () => {
    render(
      <ImagePreviewSurface
        className="media-preview__asset media-preview__asset--image media-preview__asset--standalone"
        label="Topology diagram"
        resolvedUrl="/api/vfs/raw?path=kernel%2Fdocs%2Fassets%2Ftopology.png"
        testId="image-preview"
      />,
    );

    expect(screen.getByTestId("image-preview")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Topology diagram" })).toHaveAttribute(
      "src",
      "/api/vfs/raw?path=kernel%2Fdocs%2Fassets%2Ftopology.png",
    );
    expect(screen.getByRole("link", { name: "Open image" })).toHaveAttribute(
      "href",
      "/api/vfs/raw?path=kernel%2Fdocs%2Fassets%2Ftopology.png",
    );
  });

  it("wires toolbar buttons into zoom-pan-pinch controls", () => {
    render(
      <ImagePreviewSurface
        className="media-preview__asset media-preview__asset--image media-preview__asset--standalone"
        label="Topology diagram"
        resolvedUrl="/api/vfs/raw?path=kernel%2Fdocs%2Fassets%2Ftopology.png"
        testId="image-preview"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Center" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(imagePreviewMockState.zoomOutSpy).toHaveBeenCalledTimes(1);
    expect(imagePreviewMockState.zoomInSpy).toHaveBeenCalledTimes(1);
    expect(imagePreviewMockState.centerViewSpy).toHaveBeenCalledWith(1);
    expect(imagePreviewMockState.resetTransformSpy).toHaveBeenCalledTimes(1);
  });
});
