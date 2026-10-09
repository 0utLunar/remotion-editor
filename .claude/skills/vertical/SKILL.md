---
name: vertical
description: Cria a versão vertical 9:16 (1080x1920) do vídeo ativo, recompondo cada cena sobre a mesma timeline. NUNCA renderiza.
argument-hint: [slug]
disable-model-invocation: true
---

Argumentos: $ARGUMENTS. Resolva o vídeo ativo (CLAUDE.md › Vídeo ativo) e mostre o banner.

Leia `videos/<slug>/project.md`, `EDIT_PLAN.md`, `styles/<tipo>.md` e o `<Folder>` do vídeo em `src/Root.tsx`.

- Crie a composição `<slug>-vertical` (1080x1920, 30 FPS) dentro do mesmo `<Folder>` em `src/Root.tsx`. O `defaultProps` dela é uma cópia literal da timeline da `-main` mais os campos de enquadramento vertical (precisa ser literal para o Studio salvar). A `-main` é a fonte da verdade: rodar `/vertical` de novo ressincroniza a cópia e mantém os overrides verticais.
- Não faça só um crop central. Recomponha cada cena: o foco da ação, o personagem, a legenda, o meme e a punchline precisam estar visíveis. Para isso, acrescente ao schema campos opcionais de enquadramento vertical (ex.: `vertical: { focus, scale }` no clipe e posição alternativa nos overlays) e ajuste os componentes para usá-los quando a composição for vertical.
- Legendas e textos em zona segura (sem cobrir a UI das plataformas embaixo e à direita).
- Não quebre `<slug>-main`.

Verifique como no /build, usando `remotion still` em alguns frames de cada cena para checar elementos fora do frame. **Não rode `remotion render`.** Termine com o link `http://localhost:3000/<slug>-vertical`.
