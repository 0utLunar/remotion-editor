import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  Series,
  staticFile,
  useVideoConfig,
} from "remotion";
import { GameplayClip } from "../components/GameplayClip";
import { OverlayItem } from "../components/OverlayItem";
import { toFrames } from "../utils/time";
import { Timeline, timelineDuration } from "../utils/timelineSchema";

const EMPTY_TIMELINE_SECONDS = 3;
export const TIMELINE_FPS = 30;

// Duração da composição = soma dos clipes (ou fim do último overlay).
export const calculateTimelineMetadata: CalculateMetadataFunction<
  Timeline
> = ({ props }) => {
  const seconds = timelineDuration(props) || EMPTY_TIMELINE_SECONDS;
  return {
    fps: TIMELINE_FPS,
    durationInFrames: toFrames(seconds, TIMELINE_FPS),
  };
};

const EmptyTimeline: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: "#111",
      color: "#888",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Arial, sans-serif",
      fontSize: 48,
    }}
  >
    Timeline vazia: rode /plan e /build
  </AbsoluteFill>
);

export const TimelineVideo: React.FC<Timeline> = ({
  clips,
  overlays,
  music,
}) => {
  const { fps } = useVideoConfig();

  if (clips.length === 0 && overlays.length === 0) {
    return <EmptyTimeline />;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Series>
        {clips.map((clip) => (
          <Series.Sequence
            key={clip.id}
            name={clip.id}
            durationInFrames={toFrames(clip.duration, fps)}
            premountFor={fps}
          >
            <GameplayClip clip={clip} />
          </Series.Sequence>
        ))}
      </Series>
      {overlays.map((overlay) => (
        <Sequence
          key={overlay.id}
          name={`${overlay.type}: ${overlay.id}`}
          from={toFrames(overlay.start, fps)}
          durationInFrames={toFrames(overlay.duration, fps)}
          premountFor={fps}
        >
          <OverlayItem overlay={overlay} />
        </Sequence>
      ))}
      {music.map((track) => (
        <Sequence
          key={track.id}
          name={`music: ${track.id}`}
          from={toFrames(track.start, fps)}
          durationInFrames={toFrames(track.duration, fps)}
          premountFor={fps}
        >
          <Audio
            src={staticFile(track.src)}
            trimBefore={toFrames(track.trimBefore, fps)}
            volume={track.volume}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
