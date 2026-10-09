---
name: analyze
description: Analisa referências, assets e footage do vídeo ativo e gera ANALYSIS.md e os índices de assets. Não implementa.
argument-hint: [slug]
disable-model-invocation: true
---

Argumentos: $ARGUMENTS. Resolva o vídeo ativo (CLAUDE.md › Vídeo ativo) e mostre o banner.

Leia `videos/<slug>/project.md`, `styles/<tipo>.md`, `STYLE_GUIDE.md`. Carregue a skill `motion-direction`.

## 1. Índices de assets
Para `public/videos/<slug>/assets/` e `public/shared/editing-pack/`: se o INDEX.md não existir ou a lista de arquivos mudou, regenere.
Formato: tabela `caminho (relativo a public/) | categoria | duração | dimensões | quando usar`.
Use `npx remotion ffprobe -v error -show_entries format=duration:stream=width,height -of csv=p=0 <arquivo>`.
Categorias: meme, sfx, música, transição, overlay, imagem, vídeo, fonte, outro.

## 2. Referências e footage
Vídeos não podem ser assistidos direto. Extraia frames com
`npx remotion ffmpeg -i <arquivo> -vf fps=1/3,scale=640:-1 out/frames/<slug>/<nome>_%04d.jpg`
(ajuste o intervalo à duração) e analise as imagens. Use a duração e as quebras de cena (`select='gt(scene,0.4)'`) para medir o ritmo dos cortes.

- Referências: composição, ritmo, cortes, timing, transições, zooms, tipografia, legendas, memes, SFX, música, storytelling. Extraia princípios, não copie.
- Footage: momentos importantes, engraçados e de impacto, punchlines, trechos para remover, oportunidades de zoom, SFX, meme e legenda, sempre com arquivo + timestamp.

## 3. Saídas
- `videos/<slug>/ANALYSIS.md`: análise deste vídeo.
- `STYLE_GUIDE.md`: acrescente só princípios que valem para qualquer vídeo. Não duplique o que já está lá.
- Termine com um resumo curto. Próximo passo: `/plan`.
