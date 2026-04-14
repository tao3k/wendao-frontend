import React from "react";
import {
  MediaPlayer,
  MediaProvider,
  type AudioSrc,
  type PlayerSrc,
  type VideoSrc,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultAudioLayout,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";

export interface VideoAudioPreviewSurfaceProps {
  className: string;
  kind: "video" | "audio";
  label: string;
  resolvedContentType?: string;
  resolvedUrl: string;
  testId: string;
  title?: string;
}

function renderVidstackPlayer({
  kind,
  label,
  source,
  sourceKey,
  title,
}: Pick<VideoAudioPreviewSurfaceProps, "kind" | "label" | "title"> & {
  source: PlayerSrc;
  sourceKey: string;
}): React.ReactElement {
  return (
    <MediaPlayer
      key={sourceKey}
      load="visible"
      playsInline
      src={source}
      streamType="on-demand"
      title={title ?? label}
      viewType={kind}
    >
      <MediaProvider />
      {kind === "video" ? (
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      ) : (
        <DefaultAudioLayout icons={defaultLayoutIcons} />
      )}
    </MediaPlayer>
  );
}

export function VideoAudioPreviewSurface({
  className,
  kind,
  label,
  resolvedContentType,
  resolvedUrl,
  testId,
  title,
}: VideoAudioPreviewSurfaceProps): React.ReactElement {
  const source = React.useMemo<PlayerSrc>(() => {
    if (!resolvedContentType) {
      return resolvedUrl;
    }

    if (kind === "audio") {
      return {
        src: resolvedUrl,
        type: resolvedContentType as AudioSrc["type"],
      };
    }

    return {
      src: resolvedUrl,
      type: resolvedContentType as VideoSrc["type"],
    };
  }, [kind, resolvedContentType, resolvedUrl]);

  return (
    <div className={`${className} media-preview__player-shell`} data-testid={testId}>
      <div className="media-preview__player-toolbar">
        <div className="media-preview__player-meta">
          <span className="media-preview__player-label">{label}</span>
          <span className="media-preview__player-hint">
            {kind === "video"
              ? "Keyboard shortcuts, scrubbing, fullscreen, and PiP are handled by the player."
              : "Keyboard shortcuts, scrubbing, and rate/volume controls are handled by the player."}
          </span>
        </div>
        <div className="media-preview__player-actions">
          <a
            className="media-preview__fallback-link media-preview__fallback-link--toolbar"
            href={resolvedUrl}
            rel="noreferrer noopener"
            target="_blank"
          >
            {kind === "video" ? "Open video" : "Open audio"}
          </a>
        </div>
      </div>
      <div className="media-preview__player-stage">
        {renderVidstackPlayer({
          kind,
          label,
          source,
          sourceKey: resolvedUrl,
          title,
        })}
      </div>
    </div>
  );
}
