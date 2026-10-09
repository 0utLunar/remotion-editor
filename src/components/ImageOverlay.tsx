import {
  AbsoluteFill,
  Img,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {
  src: string;
  position: { x: number; y: number };
  width: number;
};

export const ImageOverlay: React.FC<Props> = ({ src, position, width }) => {
  const frame = useCurrentFrame();
  const { fps, width: frameWidth } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <Img
        src={staticFile(src)}
        style={{
          position: "absolute",
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          width: width * frameWidth,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};
