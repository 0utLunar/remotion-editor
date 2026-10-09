# Remotion Video Editor

Repo com vários vídeos, feitos com React + Remotion e dirigidos pelos comandos abaixo.

## Regras gerais

- Usar Remotion para composição e edição. 30 FPS por padrão, salvo o project.md dizer outra coisa.
- 1920x1080 para horizontal; 1080x1920 para vertical.
- Priorizar timing, composição, hierarquia e ritmo. Cada efeito precisa ter função visual ou narrativa.
- Referências servem para extrair princípios. Nunca copiar literalmente.
- Antes de criar um asset novo, procurar no INDEX.md de `public/videos/<slug>/assets/` e de `public/shared/editing-pack/`.
- Seguir o perfil do tipo do vídeo em `styles/<tipo>.md` e o `STYLE_GUIDE.md` global.

## Render: NUNCA renderizar

O usuário renderiza pelo Studio. Não rodar `remotion render` (também bloqueado em `.claude/settings.json`).
Para verificar, usar nesta ordem:
1. `npx tsc --noEmit`
2. `npx eslint src`
3. `npx remotion compositions` (confere id, duração, resolução e fps)
4. Abrir o Studio (`preview_start` com a config `studio` do `.claude/launch.json`) em `http://localhost:3000/<slug>-main` e passar o link ao usuário.

`npx remotion still <id> --frame=N` é permitido só para inspecionar frames durante /review e /fix (salvar em `out/`).
ffmpeg/ffprobe: usar os embutidos `npx remotion ffmpeg` / `npx remotion ffprobe`. Para análise (cortes, sheets, loudness), o script usa o `ffmpeg-static`, que é completo.

## Análise de vídeo

Nunca analisar vídeo extraindo frames na mão. Usar `npm run analyze -- <arquivo|pasta|links.txt|url> --slug <slug> --lang <idioma>`. Ele gera em `out/analysis/` um dossiê cacheado (ritmo medido, picos e silêncios de áudio, momentos candidatos, transcrição whisper ou legenda do YouTube em `Caption[]`, e contact sheets). Referências ficam em `out/analysis/_refs/` e são reaproveitadas entre vídeos. Para ver detalhe, usar `--frame-at <tempo>`. Links do YouTube precisam do yt-dlp.

## Vídeo ativo

Todos os comandos rodam sobre um vídeo (slug, ex.: `minecraft-hardcore-01`; `videos/_template/` não conta como vídeo):
- Se o primeiro argumento é um slug existente em `videos/`, usar ele (sem mudar o ativo).
- Senão, usar o conteúdo de `.active-video`. Se ele não existir, listar os vídeos ou sugerir `/new-project`.
- Começar a resposta com: `🎬 Vídeo ativo: <slug> (etapa: <etapa>)`. A etapa é deduzida dos arquivos existentes em `videos/<slug>/` (project → analysis → plan → build → review).
- Se o usuário pedir em linguagem natural para trocar ou criar vídeo, agir como `/switch` ou `/new-project`.

## Estrutura

```
videos/<slug>/            project.md, ANALYSIS.md, EDIT_PLAN.md, REVIEW.md
public/videos/<slug>/     references/ (+links.txt), assets/ (+INDEX.md), footage/
public/shared/editing-pack/   pack reutilizado em todos os vídeos (+INDEX.md)
src/components/ animations/ utils/   biblioteca compartilhada
src/compositions/TimelineVideo.tsx    renderiza qualquer timeline
src/utils/timelineSchema.ts           schema zod da timeline (tempos em segundos)
src/Root.tsx              um <Folder> por vídeo; a timeline fica inline no defaultProps
src/videos/<slug>/scenes/ cenas específicas de um vídeo (só se precisar)
styles/<tipo>.md          regras por tipo de vídeo
```

- A timeline é o `defaultProps` da composição `<slug>-main` em `src/Root.tsx`: um objeto literal escrito inline (sem variáveis, spread ou `satisfies`), com `id` literal e dentro do próprio Root. O Studio só salva as edições do painel de props nesse formato. Edições de timing e conteúdo vão nesses dados, não nos componentes.
- Componente novo que serve para outros vídeos vai em `src/components/`. Se for específico, vai em `src/videos/<slug>/scenes/`.
- Precisando de um tipo novo de overlay, estender `overlaySchema` + `OverlayItem` em vez de criar um caminho paralelo.
- IDs de composição: `<slug>-main`, `<slug>-vertical`, dentro de `<Folder name={slug}>`.

## Comandos

| Comando | Lê | Gera |
|---|---|---|
| `/new-project <slug>` | perguntas ao usuário | `videos/<slug>/project.md`, pastas, `<Folder>` no Root, `.active-video` |
| `/switch [slug]` | `videos/*` | troca o ativo ou lista os vídeos |
| `/analyze` | references, assets, footage | `ANALYSIS.md`, INDEX.md, STYLE_GUIDE.md |
| `/plan` | project, ANALYSIS, INDEX | `EDIT_PLAN.md` + timeline no `Root.tsx` |
| `/build [cena]` | EDIT_PLAN, timeline | componentes + composição, Studio aberto |
| `/review [cena]` | composição | `REVIEW.md` (top 10) |
| `/fix [itens]` | REVIEW.md | correções, itens marcados |
| `/vertical` | timeline | `<slug>-vertical` 1080x1920 |
