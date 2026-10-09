---
name: plan
description: Cria o plano de edição (EDIT_PLAN.md) e a timeline em dados (defaultProps no Root.tsx) do vídeo ativo. Não implementa componentes.
argument-hint: [slug] [direção extra]
disable-model-invocation: true
---

Argumentos: $ARGUMENTS. Resolva o vídeo ativo (CLAUDE.md › Vídeo ativo) e mostre o banner.

Leia: `videos/<slug>/project.md`, `videos/<slug>/ANALYSIS.md`, `styles/<tipo>.md`, `STYLE_GUIDE.md`, e os INDEX.md de assets. Não varra as pastas de assets de novo. Carregue a skill `motion-direction`.

## EDIT_PLAN.md (`videos/<slug>/EDIT_PLAN.md`)
1. Conceito, estrutura narrativa, hook, desenvolvimento, clímax e encerramento (curto).
2. Storyboard por cena: tempo na timeline, arquivo + tempo original, duração, objetivo, e só os elementos que a cena usa (zoom, legenda, meme, SFX, música, transição, intensidade). Não preencha campos vazios.
3. Lista de componentes ou overlays que ainda não existem em `src/components/` e que o /build vai precisar criar.

## Timeline (`defaultProps` de `<slug>-main` em `src/Root.tsx`)
Traduza o storyboard para o schema de `src/utils/timelineSchema.ts`: tempos em segundos, caminhos relativos a `public/`, IDs legíveis (`hook-01`, `punch-ship-sinks`). Escreva como objeto literal inline, sem variáveis, spread ou `satisfies`, para o Studio conseguir salvar as edições. Só use assets que existem nos índices.
Se o plano precisar de algo que o schema não cobre, anote no EDIT_PLAN para o /build estender o schema. Não invente campos na timeline.

Valide: soma das durações ≈ duração do project.md; `npx tsc --noEmit`.
Resumo final: duração total, nº de cenas e o que o /build vai criar. Próximo passo: `/build`.
