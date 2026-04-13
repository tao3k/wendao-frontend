import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VideoAudioPreviewSurface } from "./VideoAudioPreviewSurface";

vi.mock("@vidstack/react", () => ({
  MediaPlayer: ({
    children,
    load,
    playsInline,
    src,
    streamType,
    title,
    viewType,
  }: {
    children: React.ReactNode;
    load?: string;
    playsInline?: boolean;
    src?: string | { src: string; type?: string };
    streamType?: string;
    title?: string;
    viewType?: string;
  }) => (
    <div
      data-load={load}
      data-plays-inline={String(Boolean(playsInline))}
      data-src={typeof src === "string" ? src : src?.src}
      data-stream-type={streamType}
      data-testid="vidstack-media-player"
      data-title={title}
      data-view-type={viewType}
    >
      {children}
    </div>
  ),
  MediaProvider: () => <div data-testid="vidstack-media-provider" />,
}));

vi.mock("@vidstack/react/player/layouts/default", () => ({
  DefaultAudioLayout: () => <div data-testid="vidstack-audio-layout" />,
  DefaultVideoLayout: () => <div data-testid="vidstack-video-layout" />,
  defaultLayoutIcons: {},
}));

describe("VideoAudioPreviewSurface", () => {
  it("renders a standalone Vidstack video surface", () => {
    render(
      <VideoAudioPreviewSurface
        className="media-preview__asset media-preview__asset--video media-preview__asset--standalone"
        kind="video"
        label="Architecture walkthrough"
        resolvedContentType="video/mp4"
        resolvedUrl="/api/vfs/raw?path=kernel%2Fdocs%2Fmedia%2Fwalkthrough.mp4"
        testId="video-preview"
      />,
    );

    const player = screen.getByTestId("vidstack-media-player");
    expect(player).toHaveAttribute(
      "data-src",
      "/api/vfs/raw?path=kernel%2Fdocs%2Fmedia%2Fwalkthrough.mp4",
    );
    expect(player).toHaveAttribute("data-view-type", "video");
    expect(player).toHaveAttribute("data-stream-type", "on-demand");
    expect(screen.getByTestId("vidstack-video-layout")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open video" })).toHaveAttribute(
      "href",
      "/api/vfs/raw?path=kernel%2Fdocs%2Fmedia%2Fwalkthrough.mp4",
    );
  });

  it("renders a standalone Vidstack audio surface", () => {
    render(
      <VideoAudioPreviewSurface
        className="media-preview__asset media-preview__asset--audio media-preview__asset--standalone"
        kind="audio"
        label="Meeting audio"
        resolvedContentType="audio/mpeg"
        resolvedUrl="/api/vfs/raw?path=kernel%2Fdocs%2Fmedia%2Fmeeting.mp3"
        testId="audio-preview"
      />,
    );

    const player = screen.getByTestId("vidstack-media-player");
    expect(player).toHaveAttribute(
      "data-src",
      "/api/vfs/raw?path=kernel%2Fdocs%2Fmedia%2Fmeeting.mp3",
    );
    expect(player).toHaveAttribute("data-view-type", "audio");
    expect(screen.getByTestId("vidstack-audio-layout")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open audio" })).toHaveAttribute(
      "href",
      "/api/vfs/raw?path=kernel%2Fdocs%2Fmedia%2Fmeeting.mp3",
    );
  });
});
