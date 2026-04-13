import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MediaPreviewSurface } from "./MediaPreviewSurface";

vi.mock("./ImagePreviewSurface", () => ({
  ImagePreviewSurface: ({
    label,
    resolvedUrl,
    testId,
  }: {
    label: string;
    resolvedUrl: string;
    testId: string;
  }) => (
    <div data-testid={testId}>
      <span>{label}</span>
      <span>{resolvedUrl}</span>
    </div>
  ),
}));

vi.mock("./VideoAudioPreviewSurface", () => ({
  VideoAudioPreviewSurface: ({
    kind,
    label,
    resolvedUrl,
    testId,
  }: {
    kind: "video" | "audio";
    label: string;
    resolvedUrl: string;
    testId: string;
  }) => (
    <div data-testid={testId}>
      <span>{kind}</span>
      <span>{label}</span>
      <span>{resolvedUrl}</span>
    </div>
  ),
}));

describe("MediaPreviewSurface", () => {
  it("keeps inline images on the native image path", () => {
    render(
      <MediaPreviewSurface
        mode="inline"
        sourcePath="kernel/docs/index.md"
        target="assets/topology.png"
        testId="inline-image-preview"
      />,
    );

    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "/api/vfs/raw?path=kernel%2Fdocs%2Fassets%2Ftopology.png",
    );
  });

  it("routes standalone images through the dedicated image viewer module", async () => {
    render(
      <MediaPreviewSurface
        alt="Topology image"
        mode="standalone"
        sourcePath="kernel/docs/index.md"
        target="assets/topology.png"
        testId="standalone-image-preview"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("standalone-image-preview")).toBeInTheDocument();
    });
    expect(screen.getByText("Topology image")).toBeInTheDocument();
    expect(
      screen.getByText("/api/vfs/raw?path=kernel%2Fdocs%2Fassets%2Ftopology.png"),
    ).toBeInTheDocument();
  });

  it("routes standalone videos through the dedicated media player module", async () => {
    render(
      <MediaPreviewSurface
        alt="Architecture walkthrough"
        mode="standalone"
        sourcePath="kernel/docs/index.md"
        target="media/walkthrough.mp4"
        testId="standalone-video-preview"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("standalone-video-preview")).toBeInTheDocument();
    });
    expect(screen.getByText("video")).toBeInTheDocument();
    expect(screen.getByText("Architecture walkthrough")).toBeInTheDocument();
    expect(
      screen.getByText("/api/vfs/raw?path=kernel%2Fdocs%2Fmedia%2Fwalkthrough.mp4"),
    ).toBeInTheDocument();
  });
});
