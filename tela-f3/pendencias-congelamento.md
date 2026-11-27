# Tela F3 — o que falta para congelar a referência 1.0.0 (27/11/2026)

Estado: rascunho medido. `ground-truth-processos-f3.json` 1.0.0 montado por `tela-f3/montar-referencia.mjs` (a partir de
`tela-f3/semeadas.mjs` e `tela-f3/estados.mjs`), conferido nos dois builds, sem oráculo, sem axe e sem detector. Nada aqui
foi para `main` nem foi enviado. Para refazer tudo: servir os dois builds (`node tela-f3/servir.mjs <árvore> <porta>`) e
`bash tela-f3/rodar-rascunho.sh <url semeado> <url sem semente>`; a sonda e as árvores: `npx tsx tela-f3/sonda.mts …` e
`npx tsx tela-f3/conferir-arvores.mts …`.

## Feito

| Item | Arquivo | Resultado |
|---|---|---|
| Referência | `ground-truth-processos-f3.json` | 25 specs (12 semeadas, 13 naturais, 4 expostas dentro das naturais), 69 unidades (12 semeadas), 6 paradas em 9 segmentos (paradas nos segmentos 0, 2, 4, 6, 8), 8/12 semeadas com predicado |
| Conferência da bancada, build semeado | `conferir-referencia-semeada.log` | 0 problemas; 8/8 predicados sustentam; naturais com as contagens da D |
| Conferência da bancada, build sem semente | `conferir-referencia-sem-semente.log` | só os 8 predicados refutam e a âncora da F3-03 não casa (a tag sai com o ×): os esperados; nenhum problema de estado, segmento, aditividade ou contagem |
| Sonda própria (Playwright, todas as paradas, nos dois builds) | `sonda.mts`, `sonda.json` | 12/12 predicados próprios valem no semeado e falham no sem semente; 0 requisições externas, 0 erros de página |
| Entrada direta × navegando | `conferir-arvores.mts`, `conferir-arvores.json` | árvore igual nos 5 segmentos com parada, nos dois builds (o que o scanner e a linha de base fazem, D-60) |
| Construção | `conferencia-construcao.json`, `construcao/` (cópia das provas do construtor) | 12/12 semeadas violadas no semeado e conformes no sem semente |
| Naturais e pares da D re-medidos com o código da D | `remedida-d/` | evidência das 13 naturais idêntica entre os builds (com a âncora nova da D-14 nos dois); 10 de 12 pares da D idênticos; os 2 que diferem (breadcrumb-tab, por M-07; item-superficie, por M-09) estão fora dos conformes |
| Reancoragem | `_meta.estratos.natural.reancoradas` | D-14: `.br-avatar .content` → `.br-avatar > span` (a mesma da F2; o código da D com a âncora antiga quebra no semeado, `remedida-d/semeada.log`) |
| Controles | `conformes.json` | 9, não 12 (14 elegíveis da D − 5 com elemento participante de semeada ou medida contaminada; ≤ 12, sem sorteio) |
| Cláusulas e ids × corpus e base servida | `conferencia-ids-base.json` | 13/13 trechos literais; 13/13 ids casam; 2 semeadas sem id confirmadas (F3-06, F3-10); 19/19 ids das naturais existem; 8 repetições declaradas |
| Estratos | `estratos-1.0.0.json` | formato `tela-f3-estratos-1.0.0`, aceito por `conferirEstratos` e `regraDaTela`; sha256 da referência `PENDENTE-CONGELAMENTO` |
| Critérios de julgamento | `criterios-de-julgamento.json` | 25/25 specs (17 completos sem predicado, 8 linhas com predicado), aceito por `criteriosParaOJuiz` (`validar-criterios.ts`) |
| Auditoria cega | `auditoria-cega/` (chave fora do pacote) → `.tmp-eval/tela-f3-auditoria/pedido/` | 24 afirmações (12 + 12 iscas medidas falsas antes; 5 iscas pedem interação) |
| NAT-71 | `classes-nat71/` → `.tmp-eval/tela-f3-nat71/pedido/` | 12 semeadas aos classificadores; 13 naturais herdam da D |

## Falta, em ordem

1. Dois auditores cegos respondem; conferir contra `auditoria-cega/chave.json`. Semeada não confirmada pelos dois, ou
   isca confirmada: PARA (não congela; condição de parada do pedido).
2. Dois classificadores cegos (`classificador-1|2.json`); o 3º só onde 1 e 2 discordam.
3. Classes D-156 (`tela-d/classes-d156.ts` sobre a referência final).
4. Conferência final na ala do corpus e página congelada (`pagina-congelada.json`).
5. `status` sem RASCUNHO; campos de congelamento no `_meta`; commit da referência sozinho.
6. `estratos.mjs --selar` e `criterios.mjs` (citam o sha256 final); registro `congelamento-1.0.0.md`; manifesto de
   entrega para a bancada.

> **Fechado em 27/11:** itens 1–6 feitos; referência congelada no commit `1209423` (sha256 `14baee19…`). Registro em
> `congelamento-1.0.0.md`. O passo seguinte (commit em `telas.json` e na lista de telas com critérios) é da bancada,
> com o manifesto de `.tmp-eval/tela-f3-para-bancada/`.
