// Cada vídeo = um <Folder name="<slug>"> com suas composições (o /new-project adiciona).
// A timeline é o `defaultProps`, escrito inline e com `id` literal: o Studio só
// consegue salvar edições do painel de props quando está assim, aqui no Root.
// Tempos em segundos; caminhos relativos a public/.
//
// Modelo:
//   <Folder name="meu-video">
//     <Composition
//       id="meu-video-main"
//       component={TimelineVideo}
//       schema={timelineSchema}
//       calculateMetadata={calculateTimelineMetadata}
//       width={1920}
//       height={1080}
//       defaultProps={{
//         clips: [],
//         overlays: [],
//         music: [],
//       }}
//     />
//   </Folder>
//
// Imports necessários:
//   import { Composition, Folder } from "remotion";
//   import { calculateTimelineMetadata, TimelineVideo } from "./compositions/TimelineVideo";
//   import { timelineSchema } from "./utils/timelineSchema";
export const RemotionRoot: React.FC = () => {
  return <></>;
};
