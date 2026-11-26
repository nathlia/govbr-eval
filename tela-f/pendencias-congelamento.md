# Tela F: o que falta para congelar a referência

Estado em 26/11/2026, depois da construção. Na referência `ground-truth-processos-f.json` 1.0.0 (RASCUNHO), a parte
medível está fechada. Faltam os passos que dependem de agentes cegos e o fechamento.

## Feito

1. **Construção.** As 12 mudanças pegaram, sem nenhuma diferença sem atribuição. A evidência está em `construcao/`,
   commitada. As 12 entradas do diff do fonte (`pnip-mock` 3d02f68..f8905a8) são as da `lista-de-mudancas.json`, uma
   a uma; a da F-11 é a reordenação equivalente.
2. **`check-reference` no build semeado servido** (`conferir-referencia-semeada.log`): 0 problemas. Foram 4 estados
   em 2 segmentos, 25 specs e 77 unidades, com todas as âncoras resolvendo. Os 11 predicados sustentam. As 13
   naturais têm as contagens da D (57 unidades). O contrafactual no build sem semente está em
   `conferir-referencia-sem-semente-rascunho.log`, com os 11 predicados refutando.
3. **Re-medida das naturais e dos controles** com o código da D (`remedida-d/`, cópia com trocas só de ala e caminho;
   ver `preparar.mjs`). Rodou nos dois builds:
   - A evidência das 13 naturais é byte a byte igual entre o build sem semente e o semeado. Não há nenhuma
     coviolação.
   - As falhas que aparecem nos dois builds são esperadas, porque a ala não é a pnip-d: bytes/manifesto,
     `_meta.states`/`path` e o destino da D-02 em `/pnip-f/login`.
   - Só o semeado muda o par `botoes-rotulo` (excluído) e o valor do K-06 da D (excluído).
4. **Lacunas da construção** (`lacunas-construcao.json`): nenhuma semeada tem pseudo-elemento como observável. Nas
   células da F-01 e da F-09, medidas nos dois builds, a largura útil é igual (120 px). No semeado, 9 de 9 células
   cortam o texto, sem reticências e sem title; o padding vertical passa de 16 para 12 px nas 81 células e o
   cabeçalho segue em 16 px. A descrição da F-01 foi corrigida: não cita largura máxima.
5. **Controles** (`sortear-conformes-f.mjs` → `conformes.json`): procedimento da D, com as âncoras das semeadas
   somadas à exclusão.
   - Saem K-06, K-11 e K-12 (e o par `botoes-rotulo`).
   - Entra `breadcrumb-orientacao`.
   - Sobram 10 elegíveis, que é ≤ 12, então não há sorteio: a F fica com **10 controles**.
   - Todos estão conformes na página semeada.
6. **Ids × base servida** (`conferir-ids-base.mjs` → `conferencia-ids-base.json`): os 12 ids das semeadas existem na
   base servida e casam, e a F-12 continua sem id (`sem-id-mapeado-1.0.0.json`). Os 19 ids das naturais existem.
7. **Pacote da auditoria cega** (`auditoria-cega/montar.mjs`):
   - 24 afirmações: as 12 semeadas e 12 iscas falsas na página (medidas), embaralhadas com a semente gravada.
   - O pedido fica em `auditoria-cega/pedido/` e numa cópia em `.tmp-eval/tela-f-auditoria/pedido/`.
   - A chave fica em `auditoria-cega/chave.json`.
   - Nenhum auditor foi iniciado.

## Falta

1. **Duas auditorias cegas** sobre `.tmp-eval/tela-f-auditoria/pedido/`, independentes e só com a cópia de fora. Na
   leitura, usar `chave.json`:
   - Uma semeada `falsa` ou `indecidivel` pede revisão da descrição.
   - Uma isca `verdadeira` pede revisão do auditor ou da isca.
   - Se a descrição de uma semeada mudar, mudam juntos `criterios-de-julgamento-sem-predicado.json` e a descrição
     na referência.
2. **Classes NAT-71** das 12 semeadas, por dois classificadores cegos, com a autora nos desacordos; depois
   `_meta.classes`. As naturais mantêm as classes da D.
3. **Fechamento**:
   - Tirar "RASCUNHO" de `_meta.status`; preencher `_meta.evidencia` e `_meta.auditoria`.
   - `npx tsx tela-d/classes-d156.ts --referencia ground-truth-processos-f.json --saida tela-f/classes-d156-1.0.0.json`.
   - `node tela-f/niveis.mjs --selar`.
   - Preencher o sha256 da referência em `criterios-de-julgamento-sem-predicado.json` e `sem-id-mapeado-1.0.0.json`.
   - Gravar `ground-truth-processos-f.sha256`.
   - Repetir `check-reference` no build semeado (do corpus, ramo `tela-f` 157a3cc) com a entrada real de `telas.json`.
   - Repetir `conferir-ids-base.mjs`.
   - Rodar `regraDaTela`/`conferirNiveis` do ramo `bancada-f` sobre a referência final.
   - Fazer um commit só com isso.
