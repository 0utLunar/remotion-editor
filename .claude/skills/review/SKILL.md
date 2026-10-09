---
name: review
description: Revisa a composição do vídeo ativo como um editor profissional e salva os 10 maiores problemas em REVIEW.md. Não altera código.
argument-hint: [slug] [cena ou intervalo, ex. 01:20-02:00]
disable-model-invocation: true
---

Argumentos: $ARGUMENTS. Resolva o vídeo ativo (CLAUDE.md › Vídeo ativo) e mostre o banner.

Leia `videos/<slug>/project.md`, `EDIT_PLAN.md`, `ANALYSIS.md`, `styles/<tipo>.md`, `STYLE_GUIDE.md`, a timeline (`defaultProps` de `<slug>-main` em `src/Root.tsx`). Carregue a skill `motion-direction`.

Para ver o vídeo, gere stills nos momentos-chave (hook, punchlines, transições, overlays):
`npx remotion still <slug>-main out/review/<slug>/f<frame>.png --frame=<frame>`.
Ou use screenshots do Studio aberto. **Não renderize o vídeo.**

Avalie: retenção (hook, primeiros segundos, momentos mortos, ritmo, duração dos planos), edição (cortes, zooms, crops, transições, repetição), humor (timing, memes, pausas), motion (easing, escala, entradas e saídas, excesso), áudio (música, SFX, sincronia, volume, pelo que a timeline indica) e visual (composição, hierarquia, legibilidade, consistência).

Salve `videos/<slug>/REVIEW.md` com os 10 maiores problemas em ordem de impacto, numerados:

```
## 1. [ ] <título>
- Onde: <tempo/cena/id na timeline>
- Problema / Impacto
- Correção: <concreta, de preferência como mudança na timeline>
```

Não altere código. Mostre a lista resumida. Próximo passo: `/fix` ou `/fix 1,3`.
