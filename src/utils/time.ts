export const toFrames = (seconds: number, fps: number): number =>
  Math.round(seconds * fps);
