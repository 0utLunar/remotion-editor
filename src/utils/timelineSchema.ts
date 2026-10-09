import { zColor } from "@remotion/zod-types";
import { z } from "zod";

// Todos os tempos estão em SEGUNDOS (mais fácil de editar no Studio).
// Os caminhos de mídia são relativos a public/ (ex: "videos/<slug>/footage/run1.mp4").

const position = z.object({
  x: z.number().min(0).max(1).describe("0 = esquerda, 1 = direita"),
  y: z.number().min(0).max(1).describe("0 = topo, 1 = base"),
});

export const clipSchema = z.object({
  id: z.string(),
  src: z.string().describe("Footage, relativo a public/"),
  trimBefore: z.number().min(0).describe("Início no arquivo original (s)"),
  duration: z.number().positive().describe("Duração na timeline (s)"),
  volume: z.number().min(0).max(2),
  zoom: z
    .object({
      scale: z.number().min(1).max(3),
      focus: position,
      at: z.number().min(0).describe("Início do zoom, relativo ao clipe (s)"),
    })
    .optional(),
});

const overlayBase = {
  id: z.string(),
  start: z.number().min(0).describe("Início na timeline (s)"),
  duration: z.number().positive().describe("Duração (s)"),
};

export const overlaySchema = z.discriminatedUnion("type", [
  z.object({
    ...overlayBase,
    type: z.literal("caption"),
    text: z.string(),
  }),
  z.object({
    ...overlayBase,
    type: z.literal("impactText"),
    text: z.string(),
    color: zColor(),
  }),
  z.object({
    ...overlayBase,
    type: z.literal("image"),
    src: z.string().describe("Imagem/meme, relativo a public/"),
    position,
    width: z.number().min(0.05).max(1).describe("Largura relativa ao frame"),
  }),
  z.object({
    ...overlayBase,
    type: z.literal("sfx"),
    src: z.string(),
    volume: z.number().min(0).max(2),
  }),
]);

export const musicSchema = z.object({
  id: z.string(),
  src: z.string(),
  start: z.number().min(0),
  duration: z.number().positive(),
  trimBefore: z.number().min(0),
  volume: z.number().min(0).max(1),
});

export const timelineSchema = z.object({
  clips: z.array(clipSchema).describe("Tocados em sequência"),
  overlays: z.array(overlaySchema),
  music: z.array(musicSchema),
});

export type Clip = z.infer<typeof clipSchema>;
export type Overlay = z.infer<typeof overlaySchema>;
export type Music = z.infer<typeof musicSchema>;
export type Timeline = z.infer<typeof timelineSchema>;

export const timelineDuration = (timeline: Timeline): number => {
  const clipsEnd = timeline.clips.reduce((sum, c) => sum + c.duration, 0);
  const overlaysEnd = Math.max(
    0,
    ...timeline.overlays.map((o) => o.start + o.duration),
  );
  return Math.max(clipsEnd, overlaysEnd);
};
