import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import type { Overlay } from "../utils/timelineSchema";
import { Caption } from "./Caption";
import { ImageOverlay } from "./ImageOverlay";
import { ImpactText } from "./ImpactText";

export const OverlayItem: React.FC<{ overlay: Overlay }> = ({ overlay }) => {
  switch (overlay.type) {
    case "caption":
      return <Caption text={overlay.text} />;
    case "impactText":
      return <ImpactText text={overlay.text} color={overlay.color} />;
    case "image":
      return (
        <ImageOverlay
          src={overlay.src}
          position={overlay.position}
          width={overlay.width}
        />
      );
    case "sfx":
      return <Audio src={staticFile(overlay.src)} volume={overlay.volume} />;
  }
};
