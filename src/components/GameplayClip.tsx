import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { toFrames } from "../utils/time";
import type { Clip } from "../utils/timelineSchema";

const ZOOM_IN_SECONDS = 0.4;

export const GameplayClip: React.FC<{ clip: Clip }> = ({ clip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = clip.zoom
    ? interpolate(
        frame,
        [
          toFrames(clip.zoom.at, fps),
          toFrames(clip.zoom.at + ZOOM_IN_SECONDS, fps),
        ],
        [1, clip.zoom.scale],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.33, 1, 0.68, 1),
        },
      )
    : 1;

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        transformOrigin: clip.zoom
          ? `${clip.zoom.focus.x * 100}% ${clip.zoom.focus.y * 100}%`
          : "center",
      }}
    >
      <Video
        src={staticFile(clip.src)}
        trimBefore={toFrames(clip.trimBefore, fps)}
        volume={clip.volume}
        objectFit="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </AbsoluteFill>
  );
};
