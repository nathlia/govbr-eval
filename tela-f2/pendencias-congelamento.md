# Tela F2 — o que falta para congelar a referência 1.0.0 (26/11/2026)

Estado: rascunho medido. `ground-truth-processos-f2.json` 1.0.0 montado por `tela-f2/montar-referencia.mjs`, conferido
nos dois builds, sem oráculo, sem axe e sem detector. Nada aqui foi para `main` nem foi enviado.

## Feito

| Item | Arquivo | Resultado |
|---|---|---|
| Referência | `ground-truth-processos-f2.json` | 25 specs (12 semeadas, 13 naturais, 4 expostas dentro das naturais), 69 unidades (12 semeadas), 3 paradas em 3 segmentos (paradas nos segmentos 0 e 2), 11/12 semeadas com predicado |
| Conferência da bancada, build semeado | `conferir-referencia-semeada.log` | 0 problemas; 11/11 predicados sustentam; naturais com as contagens da D |
| Conferência da bancada, build sem semente | `conferir-referencia-sem-semente.log` | só os 11 predicados refutam (esperado); nenhum problema de estado, segmento, âncora ou contagem |
| Construção | `conferencia-construcao.json`, `construcao/` (cópia das provas do construtor) | 12/12 semeadas violadas no semeado e conformes no sem semente (a sem predicado pela sonda, `sonda.json`) |
| Naturais e pares da D re-medidos com o código da D | `remedida-d/` | evidência das 13 naturais e dos 12 pares idêntica entre os builds (com a âncora nova da D-14 nos dois) |
| Reancoragem | `_meta.estratos.natural.reancoradas` | D-14: `.br-avatar .content` → `.br-avatar > span` (mesmo elemento; descrição intacta); o código da D com a âncora antiga quebra no semeado (`remedida-d/semeada.log`) |
| Controles | `conformes.json` | 9, não 12 (14 elegíveis da D − 5 com elemento participante de semeada; ≤ 12, sem sorteio) |
| Ids × base servida | `conferencia-ids-base.json` | 10/10 ids das semeadas casam; 3 semeadas sem id confirmadas; 19/19 ids das naturais existem |
| Estratos | `estratos-1.0.0.json` | formato `tela-f2-estratos-1.0.0`, aceito por `conferirEstratos`; sha256 da referência `PENDENTE-CONGELAMENTO` |
| Critérios de julgamento | `criterios-de-julgamento.json` | 25/25 specs (14 completos sem predicado, 11 linhas com predicado), aceito por `criteriosParaOJuiz` (`validar-criterios.ts`) |
| Auditoria cega | `auditoria-cega/` (chave fora do pacote) → `.tmp-eval/tela-f2-auditoria/pedido/` | 24 afirmações (12 + 12 iscas medidas falsas antes) |
| NAT-71 | `classes-nat71/` → `.tmp-eval/tela-f2-nat71/pedido/` | 12 semeadas aos classificadores; 13 naturais herdam da D (`heranca-naturais.json`; D-14 idêntica fora a âncora) |

## Falta, em ordem

1. Dois auditores cegos respondem (`.tmp-eval/tela-f2-auditoria/auditor-1|2/respostas.json`); conferir contra
   `auditoria-cega/chave.json`. Semeada não confirmada pelos dois: corrigir a descrição, não o defeito.
2. Dois classificadores cegos (`classificador-1|2.json`); o 3º só onde 1 e 2 discordam (regra da F).
3. Classes D-156 (`tela-d/classes-d156.ts` sobre a referência final).
4. Conferência final na ala do corpus (`.tmp-eval/corpus-tela-f2/public/pnip-f2/`, servida em 3320) e página
   congelada (`pagina-congelada.json`).
5. `status` sem RASCUNHO; campos de congelamento no `_meta` como na F (`confirmacaoCega`, `porSpec`, `classes`,
   `criteriosDeJulgamento`, `paginaCongelada`, `evidencia`); commit da referência sozinho.
6. `npx tsx tela-f2/estratos.mjs --selar` e `node tela-f2/criterios.mjs` (critérios citam o sha256 final); depois o
   commit pequeno em `telas.json` (`reference`, `estratos`, `criteriosDeJulgamento`) e a lista de telas com critérios em
   `test-e14-criterios.ts`, como na F.

## Registro de decisões desta fase (vetáveis)

- Parada `lista-filtro` da F fora: nenhuma semeada da F2 a usa.
- F2-08 e F2-10 com `scope: composicao` (uma regra define o conjunto), como a F-09 da F.
- F2-12 (hover) fica no estado `inicial`: o setup não tem passo de hover; o predicado mede a custom property `--hover`
  do hospedeiro, e o critério diz que o observável é com o mouse em cima.
- Controles: além da âncora, sai o par cujo elemento é o hospedeiro em que a mudança semeada está escrita.
