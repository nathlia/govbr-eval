# Docs — govbr-eval

Índice da pasta. Quem chega sem contexto deve começar por
[`thesis-workspace/MAPA.md`](../../thesis-workspace/MAPA.md). As decisões de método estão em
`../../thesis-workspace/tcc2-decisions-log.md` (D-xx), e os comandos da bancada em `../CLAUDE.md`.

Os arquivos não mudam de lugar: artefatos congelados (por exemplo `tela-a/sorteio.json`) e o log
citam esses caminhos. Um documento novo entra numa das três seções abaixo.

## Método — como a medida funciona (permanente, mantido atualizado)

| Documento | Assunto |
|---|---|
| [`semantic-scoring.md`](semantic-scoring.md) | **O principal.** Pontuação semântica v02: filas, revisão cega, cenas, unidades, métricas. |
| [`adjudicacao.md`](adjudicacao.md) | Quem julga as alegações e quando o assistente chama a autora (D-48). |
| [`ancoragem.md`](ancoragem.md) | Como uma alegação é ancorada num elemento da página viva. |
| [`pacote-revisao-fluxo.md`](pacote-revisao-fluxo.md) | O pacote de revisão da suíte de fluxo (v01). |
| [`tela-a-procedimento-sorteio.md`](tela-a-procedimento-sorteio.md) | Procedimento do sorteio dos defeitos da tela A. Citado por artefatos congelados. |
| [`ablation-design.md`](ablation-design.md) | Desenho da ablação com/sem oráculo. |
| [`mcp-tool-profiles.md`](mcp-tool-profiles.md) | Perfis de ferramentas MCP de cada braço. |
| [`case-matrix.md`](case-matrix.md) | Eixos e filtros da matriz de casos (v01, D-12). |
| [`skill-mcp-efficiency-checklist.md`](skill-mcp-efficiency-checklist.md) | Checklist de eficiência de protocolo + MCP. |

## Registros datados — o que se viu numa data (não se atualizam)

| Data | Documento | Assunto |
|---|---|---|
| 2026-07-11 | [`pilot-run-2026-07-11.md`](pilot-run-2026-07-11.md) | Primeira execução empírica + auditorias axe/eslint. |
| 2026-08-19 | [`organic-candidates-2026-08-19.md`](organic-candidates-2026-08-19.md) | Candidatos da ala orgânica. |
| 2026-09-02 | [`adjudicacao-fluxo-2026-09-02.md`](adjudicacao-fluxo-2026-09-02.md) | Adjudicação da suíte de fluxo (v01). |
| 2026-09-02 | [`diagnostico-fluxo-normative-opus5-r1-2026-09-02.md`](diagnostico-fluxo-normative-opus5-r1-2026-09-02.md) | Diagnóstico de uma execução normativa. |
| 2026-09-09 | [`auditoria-gabarito-fluxo-2026-09-09.md`](auditoria-gabarito-fluxo-2026-09-09.md) | Auditoria da referência da tela de fluxo. |

## Próximo plano — rascunhos da reformulação (2026-10-02, ainda não commitados)

| Documento | Assunto |
|---|---|
| [`plano-implementacao-benchmark-isolado-2026-10-02.md`](plano-implementacao-benchmark-isolado-2026-10-02.md) | Plano do benchmark isolado com/sem oráculo. |
| [`diagnostico-operacao-benchmark-2026-10-02.md`](diagnostico-operacao-benchmark-2026-10-02.md) | Diagnóstico: operar e entender o benchmark sem depender de IA. |
| [`revisao-prompt-ab-2026-10-02.md`](revisao-prompt-ab-2026-10-02.md) | Revisão do prompt da ablação. |
