---
name: analyze
description: Analisa referências (arquivos e links do YouTube), assets e footage do vídeo ativo via dossiês e gera ANALYSIS.md e os índices de assets. Não implementa.
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

## 2. Dossiês (não assista vídeo frame a frame)
Rode o analisador. Ele é cacheado, então rodar de novo é barato:

```bash
npm run analyze -- public/videos/<slug>/references --slug <slug> --lang <idioma das refs>
npm run analyze -- public/videos/<slug>/footage --slug <slug> --lang <idioma da footage>
```

- A pasta `references/` inclui os arquivos de vídeo e o `links.txt` (uma URL por linha; opcional `01:20-03:00` para um trecho e `subs-only` para baixar só a legenda).
- `--lang` é o idioma da fala (`pt`, `en`...), deduzido do project.md ou do título da referência.
- Se o yt-dlp não estiver instalado, avise o usuário (`winget install yt-dlp.yt-dlp`) e siga com o resto.
- A primeira transcrição baixa o modelo whisper, então demora mais.

Cada dossiê (`out/analysis/.../dossier.md`) traz ritmo medido, áudio (picos e silêncios), momentos candidatos, transcrição e contact sheets. Para cada vídeo:
1. Leia o `dossier.md`.
2. Olhe as contact sheets (`sheets/*.jpg`, 16 planos por imagem com #número e tempo).
3. Só onde precisar de detalhe: `npm run analyze -- <arquivo> --frame-at <tempo>` (1 frame em resolução cheia). Para links, só com `--keep`.

## 3. O que extrair
- **Referências:** princípios, não cópia. Ritmo **com números** do dossiê (ex.: "plano médio 1,8 s; hook com cortes de 0,6 s; ~30 cortes/min no clímax"), hook, transições, zooms, tipografia, legendas, memes, SFX, música e storytelling.
- **Footage:** momentos importantes, engraçados e de impacto, punchlines, trechos para remover (silêncios longos, tempo morto), oportunidades de zoom, SFX, meme e legenda. Sempre com arquivo + tempo exato, partindo dos "momentos candidatos" e da transcrição.

## 4. Saídas
- `videos/<slug>/ANALYSIS.md`: análise deste vídeo, com o caminho do dossiê de cada fonte (o /plan usa os `transcript.json` da footage para as legendas).
- `STYLE_GUIDE.md`: acrescente só princípios que valem para qualquer vídeo. Não duplique o que já está lá.
- Termine com um resumo curto. Próximo passo: `/plan`.
