# govbr-eval

Evaluation harness: ground truth + baselines + scoring + results dashboard. Node 18+ (`nvm use 25`).

- `ground-truth.json` — the gabarito (case × tool expected detection). It lives HERE on purpose:
  never copy it into `govbr-corpus` or `govbr-ds-validator`.
- `npm run axe` — axe-core baseline against the corpus at :3000
- `npm run score` / `score:verbose` — P/R/F1 per tool
- `npm run dashboard` — Matriz de Detecção at :4000 (axe ▶ button + result views)
- `ground-truth-fluxo.json` + `npm run ancoras` — suíte de fluxo (D-23/D-25): ancorada por seletor
  resolvido na página viva, não por seção `TC-*`. É o instrumento da tela realista com violação
  compartilhada. Suíte separada: seus números nunca se somam nem se promediam com os da suíte `TC-*`
  nem com os da orgânica (D-13). Ver `docs/ancoragem.md`.
  - **v02 (D-39):** `npm run flow:review -- prepare` monta o pacote de revisão da bateria, a autora
    decide em `reviews.json`, e `npm run score:fluxo` pontua o pacote offline
    (`flow-semantic-1.0.0`). Seletor e regra só geram candidatos: nenhuma alegação vira crédito sem
    decisão. Ver `docs/semantic-scoring.md`.
  - **v01:** `npm run score:fluxo:legacy` — casamento por (elemento × regra), só para reproduzir os
    números até o D-38. Números v01 e v02 nunca formam uma série.
  - `instrument.json`, `types.ts`, `checker-aliases.json`, `kb-aliases.json` e os scripts de
    casamento entram no hash do engine: mudar qualquer um invalida pacotes já preparados.
- `adjudications.json` — human verdicts on findings that matched no expected unit (D-21).
  `npm run adjudicate` (`--emit` semeia stubs, `--blind` julga sem ver o braço). Um veredito sem
  `rationale` não é aplicado. `npm run score` imprime **piso** e **adjudicado**, nunca um no lugar
  do outro — ver `docs/adjudicacao.md`.
- `skills/evaluate-all/SKILL.md` — protocol for measuring the agent's per-case verdicts.
  When running it, do NOT read `ground-truth.json` first; verdicts come from the live app only.

When a new case is added to the corpus, add its entry to `ground-truth.json` in the same change
(id, page, description, violations, categories, expected detection per tool).

## Protocolos (skills/) — regra inviolável

O procedimento carrega **procedimento apenas**: onde olhar, como capturar evidência, como
reportar. Conhecimento de domínio — regras do DS, valores de token, specs de componente — mora no
oráculo e **nunca** dentro de um `SKILL.md`.

Isso é o requisito A6 (`thesis-workspace/tcc2-requirements.md`), e é validade experimental, não
organização: um protocolo que diz qual é a fonte primária do DS vira um segundo oráculo, e aí
nenhum experimento consegue medir o que o oráculo MCP contribui — a ablação passa a comparar
"regra por MCP" contra "a mesma regra por texto".

A primeira versão de `skills/evaluate-all/SKILL.md` violava isso desde o commit inicial e ficou
cinco semanas assim porque nada verificava. Agora `npm run lint:protocol` verifica, e o preflight
da bateria (`pipeline/run-battery.ps1`) recusa rodar se falhar.

Ao escrever ou editar qualquer protocolo, pergunte de cada frase: **"isto diria a um agente sem
oráculo algo que ele não teria como saber sozinho?"** Se sim, vai para o oráculo.
