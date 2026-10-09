import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-end", alignItems: "center", padding: 80 }}
    >
      <div
        style={{
          opacity,
          maxWidth: "70%",
          textAlign: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontWeight: 800,
          fontSize: 56,
          color: "white",
          WebkitTextStroke: "8px black",
          paintOrder: "stroke fill",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
