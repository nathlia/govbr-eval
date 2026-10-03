# Docs — govbr-eval

Só **método permanente**: como a medida funciona. Quem chega sem contexto deve começar por
[`thesis-workspace/MAPA.md`](../../thesis-workspace/MAPA.md). As decisões estão em
`../../thesis-workspace/tcc2-decisions-log.md` (D-xx) e os comandos da bancada em `../CLAUDE.md`.

**Planos, checklists, revisões, diagnósticos e relatórios datados não entram aqui.** Desde
2026-10-02 eles moram em [`thesis-workspace/planejamento/`](../../thesis-workspace/planejamento/README.md),
inclusive o plano em curso (`atual/plano-implementacao-benchmark-isolado-2026-10-02.md`) e os registros
que estavam nesta pasta (piloto, adjudicação e auditoria da tela de fluxo, diagnósticos).

| Documento | Assunto |
|---|---|
| [`semantic-scoring.md`](semantic-scoring.md) | **O principal.** Pontuação semântica v02: filas, revisão cega, cenas, unidades, métricas. |
| [`contratos-benchmark.md`](contratos-benchmark.md) | Contratos do benchmark isolado (M0): schemas em `contracts/`, quem escreve e lê cada arquivo, estados, ausência de linha de base, mapa de acessos. |
| [`analise-execucao.md`](analise-execucao.md) | Análise determinística de um pacote ou par sem/com (T6): conferência na fronteira, política de linha de base aplicada, adaptador para o scorer existente, `summary.md`/`summary.json`, como revisar e recalcular. |
| [`painel-resultados.md`](painel-resultados.md) | Painel local de resultados e revisão sem IA (T8a): fixture, disparo, abrir resultados, revisar, recalcular, recuperar publicação falha. |
| [`exportacao-telas.md`](exportacao-telas.md) | Exportação das telas A/B para o projeto mínimo servido na coleta (T1): allowlist, servidor estático, `site-manifest.json`, auditoria e varredura de vazamento do gabarito. |
| [`skill-avaliar-tela.md`](skill-avaliar-tela.md) | Skill única e genérica de execução (T2): o que mudou em relação a `evaluate-screen` e por quê, a garantia de paridade entre braços e como renderizar o texto da tarefa. |
| [`adjudicacao.md`](adjudicacao.md) | Quem julga as alegações e quando o assistente chama a autora (D-48). |
| [`ancoragem.md`](ancoragem.md) | Como uma alegação é ancorada num elemento da página viva. |
| [`pacote-revisao-fluxo.md`](pacote-revisao-fluxo.md) | O pacote de revisão da suíte de fluxo (v01). |
| [`tela-a-procedimento-sorteio.md`](tela-a-procedimento-sorteio.md) | Procedimento do sorteio da tela A. **Congelado**: a referência da tela A o cita pelo commit; não editar. |
| [`ablation-design.md`](ablation-design.md) | Desenho da ablação com/sem oráculo. |
| [`mcp-tool-profiles.md`](mcp-tool-profiles.md) | Perfis de ferramentas MCP de cada braço. |
| [`case-matrix.md`](case-matrix.md) · `case-matrix.csv` | Eixos e filtros da matriz de casos (v01, D-12). |
| [`skill-mcp-efficiency-checklist.md`](skill-mcp-efficiency-checklist.md) | Checklist de eficiência de protocolo + MCP (critério permanente de escrita de protocolo). |
