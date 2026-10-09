---
name: build
description: Monta a composição Remotion do vídeo ativo a partir do EDIT_PLAN e da timeline, valida e abre o Studio. NUNCA renderiza.
argument-hint: [slug] [cena]
disable-model-invocation: true
---

Argumentos: $ARGUMENTS. Resolva o vídeo ativo (CLAUDE.md › Vídeo ativo) e mostre o banner. Se vier uma cena, implemente só ela.

Leia `videos/<slug>/EDIT_PLAN.md`, a timeline (`defaultProps` de `<slug>-main` em `src/Root.tsx`), `styles/<tipo>.md`. Carregue as skills `remotion-best-practices` (e a sub-referência de markup) e `motion-direction`.

## Implementar
- Reaproveite `src/components/` e `src/compositions/TimelineVideo.tsx`. Se faltar algo:
  - overlay/efeito novo reutilizável → estenda `overlaySchema` (`src/utils/timelineSchema.ts`) + `OverlayItem` + componente em `src/components/`;
  - animação reutilizável → `src/animations/`;
  - cena muito específica → `src/videos/<slug>/scenes/`.
- Timing e conteúdo ficam na timeline (dados), não hardcoded nos componentes.
- Respeite duração, resolução, FPS, estilo e as regras do project.md. Não invente mudanças criativas grandes fora do plano. Se precisar, pergunte.
- Preserve mudanças que o usuário fez à mão (ex.: via painel de props do Studio).

## Verificar (sem render)
1. `npx tsc --noEmit` e `npx eslint src`, corrigindo até passar.
2. `npx remotion compositions`: `<slug>-main` com a duração e a resolução esperadas.
3. Todo `src` da timeline existe em `public/`, nenhum overlay passa do fim e não há timestamps negativos ou sobrepostos sem intenção.
4. Abra o Studio com `preview_start` (config `studio`) em `http://localhost:3000/<slug>-main` e confira que carrega sem erro.

**Não rode `remotion render`.** Termine com: o que foi criado, o link do Studio e `/review` como próximo passo.
