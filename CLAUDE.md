# govbr-eval

Evaluation harness: ground truth + baselines + scoring + results dashboard. Node 18+ (`nvm use 25`).

- `ground-truth.json` — the gabarito (case × tool expected detection). It lives HERE on purpose:
  never copy it into `govbr-corpus` or `govbr-ds-validator`.
- `npm run axe` — axe-core baseline against the corpus at :3000
- `npm run score` / `score:verbose` — P/R/F1 per tool
- `npm run dashboard` — Matriz de Detecção at :4000 (axe ▶ button + result views). **v01 only:** it
  is no longer part of a measured run. It serves the whole repo via `/@fs`, answer keys included.
- `npm run test:isolation` — v02 measurement surface (D-40): frozen flow page + result collector +
  egress proxy (`scripts/measurement-surface.ts`), checked through the same MCP configs the runs use.
  The battery preflight refuses to start if it fails. Ports 3100/4100/4101/4102 must be free.
- `ground-truth-fluxo.json` + `npm run ancoras` — suíte de fluxo (D-23/D-25): ancorada por seletor
  resolvido na página viva, não por seção `TC-*`. É o instrumento da tela realista com violação
  compartilhada. Suíte separada: seus números nunca se somam nem se promediam com os da suíte `TC-*`
  nem com os da orgânica (D-13). Ver `docs/ancoragem.md`.
  - **v02 (D-39):** `npm run flow:review -- prepare` monta o pacote de revisão da bateria, a autora
    decide em `reviews.json`, e `npm run score:fluxo` pontua o pacote offline
    (`flow-semantic-1.3.0`). Seletor e regra só geram candidatos: nenhuma alegação vira crédito sem
    decisão. Ver `docs/semantic-scoring.md`.
  - **fatia 5:** a fila é finita e declarada. `review.md` publica TRÊS filas — ativa desta bateria (a
    única que a fecha), histórica de outras, e descobertas para a próxima referência. A autora escreve
    `decisao` (`defeito-do-gabarito` · `defeito-novo-correto` · `incorreta` · `duplicada` ·
    `evidencia-insuficiente`) e a contabilidade é derivada. `--cego` retém o texto livre em que o
    agente narra as próprias ferramentas e declara a retenção; `armLeaks` diz quantos cartões o
    denunciam. `--orcamento-revisao` grava o orçamento antes da revisão, e `esforco-revisao.json` traz
    a estimativa com a taxa declarada como não medida. A bateria é conferida slot a slot contra o
    plano congelado. Testes: `test:fila`.
  - **fatia 3:** o estado deixa de ser rótulo. `_meta.states` nomeia as paradas do `setup`, as
    âncoras são resolvidas em CADA uma, e a unidade carrega os estados medidos. Aditividade da
    sequência, `state: "sempre"` e `conditional` passam a ser cobrados contra a página — falhar
    para a preparação. Uma spec pode declarar `acceptance`: um predicado pequeno e transparente
    (`scripts/acceptance-predicates.ts`, nada importado do oráculo) medido na página congelada, que
    **sustenta** a spec mas nunca credita a alegação. Sem predicado, `nao-implementado` — que não é
    aceitação nem recusa, e jamais vira correção por elemento. **Navegação (D-57):** o `setup`
    aceita `{ "action": "navigate", "selector" | "path", "waitFor" }` — troca de rota dentro da SPA,
    por clique ou por pathname da mesma origem (pushState + popstate), nunca recarga. Cada
    `navigate` abre um SEGMENTO: a aditividade só é cobrada dentro dele, `conditional` também, e
    toda parada declara `path` (pathname), que a conferência mede junto com recarga e troca de
    endereço sem `navigate`. Cada spec é construída no fim do segmento do seu `state`. Sem
    navegação nada muda (fluxo e solicitação conferidos byte a byte). **Cenas por segmento
    (D-60):** conferência, manifesto, linha de base e pacote medem referência que navega. O plano
    guarda as paradas com `path` (no hash); cada janela vira uma cena por segmento, capturada na
    última parada dele (`1280x900@parada`, lista única em `cenasDoPlano`); as unidades ficam no
    segmento do seu `state` (`sempre` no último); toda parada tem de ficar parada por 1 s — senão
    falta declarar uma espera, e a conferência para. O scanner do oráculo não conhece `navigate`:
    entra direto na rota (com a consulta da entrada) e repete os passos seguintes, e essa árvore é
    conferida contra a navegada (ids por contador não contam; diverge ou ainda carrega → para).
    Alegação que resolve em mais de um segmento vira cartão `a-decidir`, e a revisora escreve
    `"cena"` na decisão. Só o v01 (`preparePage`: `score:fluxo:legacy`, `adjudicate`,
    `pacote:revisao`) ainda RECUSA. Ver `docs/semantic-scoring.md`. Testes: `test:states`,
    `test:semantic`, `test:manifest`, `test:fatia6` (SPA de pushState de ponta a ponta).
  - **fatia 6:** a bateria grava plano + manifesto de coleta (`scripts/collection-manifest.ts`) antes
    da primeira execução e a linha de base sob o próprio carimbo; o pacote só é preparado com esse
    manifesto, essa linha de base e o site congelado (`--collection-manifest --site-dir --baseline`),
    com uma cena por janela do plano (por segmento de cada janela, se o setup navega). O preflight
    da bateria roda `conferir:referencia` contra a página congelada antes de qualquer modelo. `npm run baselines:fluxo:dev` é o arquivo avulso
    (`results/baselines-fluxo.json`), nunca confrontável com bateria. Testes: `test:manifest`,
    `test:fatia6` (navegador real, sem modelo), `test:pipeline`.
  - **v01:** `npm run score:fluxo:legacy` — casamento por (elemento × regra), só para reproduzir os
    números até o D-38. Números v01 e v02 nunca formam uma série.
  - **fluxo-1.3.0 (fatia 2):** achado = `observed` + `expected` + `rule` (ou `null`) + `state` +
    `evidence` (`scripts/flow-contract.ts`, `npm run test:contract`). Execuções até 1.2.0 entram no
    pacote como `achado-1-legado`, nunca como o contrato novo; a evidência de cada execução fica em
    `pipeline/logs/<runId>-evidencia/`.
  - `instrument.json`, `types.ts`, `checker-aliases.json`, `kb-aliases.json`, o contrato do achado e os scripts de
    casamento entram no hash do engine: mudar qualquer um invalida pacotes já preparados.
- **Telas do instrumento de fluxo (`telas.json`, fatia 8 / D-49).** O contrato de coleta e de
  pontuação é um só (`instrument.json`); o que muda de uma tela para outra — página servida,
  referência, fonte que o ESLint lê, pastas de execução e de revisão — está em `telas.json`, lido por
  `scripts/telas.ts`. Tudo que dependia de "fluxo" escrito no código agora recebe `--tela` (padrão
  `fluxo`): `test:isolation`, `baselines:fluxo`, `collection-manifest.ts build`, e `run-battery.ps1
  -Suite fluxo -Tela <nome>`. A suíte gravada no plano e em cada execução é o NOME DA TELA, e a
  preparação do pacote recusa bateria que misture telas. Números de telas diferentes nunca se somam
  nem formam série.
  - `npm run conferir:referencia -- --tela <nome>` (com `APP_URL` apontando para o `dist/` servido)
    — mede estados, aditividade, contagens e predicados da referência contra a página, sem modelo:
    é a conferência da preparação do pacote, feita ANTES de pagar a bateria.
  - **Tela B (`vistorias`, D-57)**: a tela Vistorias PROPESC da aplicação PNIP rodando de verdade —
    o build do modo mock (`pnip-mock`, Angular 15 + `@govbr-ds/webcomponents`) congelado byte a
    byte em `govbr-corpus/public/pnip/` (manifesto com sha256 em `public/pnip/manifesto.json`).
    Entrada `pnip/portal-mpa/vistorias?mock-perfil=mpa` (a consulta escolhe a sessão fictícia: usuária já logada,
    com o vínculo de coordenador que a página inicial do portal escolheria — pnip-mock `1067443`). É
    uma SPA: `isolamento.site` faz a superfície congelar a árvore `pnip/` inteira (os chunks lazy
    não são citados por extenso), responder com `pnip/index.html` a toda rota sem extensão sob
    `/pnip/` e servir o ícone do "Sair" pelo único alias declarado. As interações são reais
    (Angular + backend em memória no navegador); recarregar volta ao estado inicial; nenhum
    recurso externo é esperado (`externos: []`). Não é entrada Vite: `sources` vazio (a linha de
    base não roda ESLint e diz por quê). **Referência `ground-truth-vistorias.json` 1.0.0** (D-61):
    29 specs, 102 unidades, 4 estados em 3 segmentos, 13 controles conformes. Saiu de auditoria
    por medição feita antes de qualquer execução (D-49, D-59; tudo em `tela-b/vistorias/`, conferência
    sem modelo `node tela-b/vistorias/conferir-auditoria.mjs`). Foi re-medida por um segundo agente e
    congelada depois das decisões da autora sobre a lista escalada. Para servir o `dist/` a
    `conferir:referencia`: `node tela-b/vistorias/servir.mjs` (porta 3217).
  - **Captura de `/privacidade` (tela B até D-57)**: saiu de `telas.json`. A página continua em
    `govbr-corpus/public/real/`, e as auditorias por medição dela e do `pnip-login` ficam em
    `tela-b/` (e `tela-b/login/`) como registro; `tela-b/comum.mjs` guarda os externos e ausentes
    que `telas.json` declarava, para que continuem reproduzíveis.
  - **Tela A (`solicitacao`)**: `ground-truth-solicitacao.json` (12 specs, 14 unidades, 3 estados).
    As specs vieram de SORTEIO — procedimento em `docs/tela-a-procedimento-sorteio.md`, tudo o mais
    em `tela-a/` (inventário, elegibilidade, sorteio, registro da construção, conferência sem
    modelo). Não edite specs à mão: a referência só muda por descarte previsto no procedimento.
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
