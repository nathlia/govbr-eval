# Conjunto auxiliar léxico — 2026-10-22 (FORA do benchmark)

45 consultas / 72 rótulos escritas por Claude consultando a base por busca de palavra, **contra o
método aceito pela autora** para o benchmark (`thesis-workspace/decisoes-do-assistente.md`,
2026-10-23: consultas novas nascem de observações reais e são rotuladas lendo a lista inteira de
regras do componente). Por isso ficam aqui e não em `benchmark-1.0.0/`:

- não contam para as 60 consultas do benchmark nem para nenhuma meta (top-5 ≥ 90%, P@5 ≥ 70%);
- não servem de reserva: estão no repositório, visíveis ao Codex;
- uso permitido: diagnóstico/regressão durante o ajuste, sempre reportado à parte como
  `auxiliar-lexical`, nunca somado ao benchmark.

Mesmo formato do benchmark (`origem: busca-lexical`, `familia` para cópias literais). O que vale
reaproveitar daqui é a conferência de ausência: os seis temas `sem_resposta` (modo escuro, rolagem
infinita, editor rico, skeleton, orientação de tela, favicon) foram procurados na base inteira
(texto, título, seção, página) e no `data/emag.json`.
