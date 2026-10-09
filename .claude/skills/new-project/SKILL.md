---
name: new-project
description: Cria um vídeo novo (briefing + pastas + registro) e o torna o vídeo ativo. Não implementa nada.
argument-hint: <slug> [descrição livre]
disable-model-invocation: true
---

Argumentos: $ARGUMENTS

1. Slug: primeiro argumento, em kebab-case (ex.: `minecraft-hardcore-01`). Se faltar, sugira um a partir do tema. Se `videos/<slug>/` já existir, pergunte se é para atualizar o briefing.
2. Faça as perguntas do briefing de uma vez só (AskUserQuestion quando houver opções claras), pulando o que já veio na descrição livre:
   tipo de vídeo, tema, duração, objetivo, público, formato (16:9 / 9:16 / ambos), FPS (padrão 30), estilo, ritmo, elementos desejados, restrições específicas.
3. Crie:
   - `videos/<slug>/project.md` a partir de `videos/_template/project.md`, com os caminhos `public/videos/<slug>/...`;
   - `public/videos/<slug>/{references,assets,footage}/.gitkeep` e `public/videos/<slug>/references/links.txt` com um comentário de exemplo (`# https://youtu.be/ID 01:20-03:00  # o que observar`);
   - um `<Folder name="<slug>">` em `src/Root.tsx` com a composição `<slug>-main` e timeline vazia, copiando o bloco-modelo comentado no topo do Root (resolução e FPS conforme o briefing).
4. Se `styles/<tipo>.md` não existir, crie um perfil curto (5 a 8 regras) para o tipo.
5. Grave o slug em `.active-video`.
6. Rode `npx tsc --noEmit` e `npx remotion compositions` para confirmar que `<slug>-main` aparece.
7. Mostre um resumo do briefing e diga exatamente onde colocar references (arquivos ou links no links.txt), assets e footage. Próximo passo: `/analyze`.
