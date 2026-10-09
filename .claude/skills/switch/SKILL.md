---
name: switch
description: Mostra o vídeo ativo e a lista de vídeos com a etapa de cada um, ou troca o vídeo ativo.
argument-hint: [slug]
disable-model-invocation: true
---

Argumentos: $ARGUMENTS

- Sem argumento: liste cada pasta em `videos/` numa tabela (slug, tipo, etapa, se há footage em `public/videos/<slug>/footage/`), marcando o ativo (`.active-video`). Etapa = último arquivo existente entre project.md → ANALYSIS.md → EDIT_PLAN.md → timeline com clipes → REVIEW.md.
- Com slug: se `videos/<slug>/` existir, grave em `.active-video` e mostre o banner `🎬 Vídeo ativo` e o próximo comando sugerido. Se não existir, sugira o slug mais parecido ou `/new-project <slug>`.

Não altere nada além de `.active-video`.
