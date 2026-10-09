---
name: fix
description: Aplica as correções do REVIEW.md no vídeo ativo (todas ou só os itens escolhidos), valida e atualiza o Studio. NUNCA renderiza.
argument-hint: [slug] [itens, ex. 1,3,5]
disable-model-invocation: true
---

Argumentos: $ARGUMENTS. Resolva o vídeo ativo (CLAUDE.md › Vídeo ativo) e mostre o banner.

Leia `videos/<slug>/REVIEW.md`, `EDIT_PLAN.md`, a timeline (`defaultProps` de `<slug>-main` em `src/Root.tsx`).

- Com números: aplique só esses itens. Sem números: aplique todos os `[ ]` em ordem de impacto.
- Prefira corrigir na timeline (dados). Mexa em componente só quando a correção for de comportamento.
- Não reescreva o que funciona e não mude decisões criativas que a revisão não apontou.
- Se existir `<slug>-vertical`, aplique a mesma mudança na cópia da timeline dela.
- Marque cada item aplicado como `[x]` no REVIEW.md, com uma linha dizendo o que mudou.

Verifique como no /build (tsc, eslint, `remotion compositions`, Studio aberto). Use `remotion still` nos frames afetados se ajudar. **Não rode `remotion render`.**
Termine com os itens aplicados, os pendentes e o link do Studio.
