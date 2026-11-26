# Tela F — o que falta para congelar a referência (depois que o build semeado existir)

Rascunho atual: `ground-truth-processos-f.json` 1.0.0, montado por `tela-f/montar-referencia-rascunho.mjs`.
Nada aqui roda oráculo ou axe na página F, e nenhum passo chama modelo, exceto os auditores e os classificadores
cegos (itens 6 e 7).

1. **Build e evidência da construção.** Ler `tela-f/construcao/` quando o coordenador disser que a construção acabou.
   Uma semeada que não pegou sai e entra a reserva (`lista-de-mudancas-reserva.json`, `podeSubstituir`). A
   referência é remontada com `node tela-f/montar-referencia-rascunho.mjs --forcar`, depois de escrever no
   script a spec da substituta (âncora, estado, predicado e descrição), a partir de `composicao.json`.
2. **`conferir:referencia` no build semeado servido.** Rodar `node tela-f/servir.mjs <árvore semeada> 3219` e
   `APP_URL=http://127.0.0.1:3219 npx tsx scripts/check-reference.ts --tela processos-f`. A entrada
   `processos-f` de `telas.json` é da bancada. Se ainda não existir, usar uma entrada temporária, sem commit, como
   foi feito no rascunho. Critério para passar: 0 problemas. Todos os predicados das semeadas têm de dar
   **sustenta**; as âncoras e contagens têm de bater em todas as specs; os 4 estados e os 2 segmentos
   (aditividade, `path`, sem recarga, cada parada estável por 1 s) também.
   - Contrafactual, já feito no build sem semente (`conferir-referencia-sem-semente-rascunho.log`): os 11 predicados
     dão **refuta**; as 13 naturais resolvem com as contagens da D; nenhum problema de estado. A âncora da F-04 não
     casa no build sem semente, e isso é esperado: o elemento só existe no semeado. Repetir no fim com a
     referência final.
3. **Âncoras e a árvore da navegação.** Conferir na página semeada que a árvore do segmento 3 (depois da ida e
   volta) é a de uma entrada direta na rota com os mesmos passos. O scanner entra direto (`entradaDireta`), e o
   preflight e o manifesto da coleta recusam se as duas divergirem. No build sem semente: 590 = 590, nenhuma
   diferença (`explorar-estados.json`).
4. **Re-medida das naturais (D-01…D-14) na página semeada.** Usar o código da D (`tela-d/conferir-auditoria.mjs`)
   apontado para a ala `pnip-f`. Toda unidade natural tem de continuar violada e com a mesma âncora e contagem.
   Se mudar, é **achado de coviolação a relatar**, e nada se ajusta em silêncio. Pontos de atenção, porque o
   elemento é o mesmo de uma semeada, mas com outra propriedade: D-03 × F-05 (tag "Meus processos") e
   D-14 × F-07 (avatar).
5. **Controles conformes.** Re-medir os 12 de `tela-d/conformes.json` na página semeada. Três têm elemento que
   participa de uma semeada: K-06 (F-06), K-11 e K-12 (F-12). Esses três saem e são repostos pelo procedimento
   de `tela-d/sortear-conformes.mjs`, nunca à mão. O procedimento acrescenta às exclusões as âncoras das semeadas
   e grava uma semente nova antes do sorteio. Depois, gravar `_meta.conformes` e o arquivo irmão com sha256.
6. **Duas auditorias cegas das descrições das semeadas.** A pergunta é se cada spec está escrita de modo que um
   juiz consiga decidir pela página. Os auditores recebem só a descrição, o estado e a página, sem nível, sem
   cláusula e sem saber que houve semeadura. Divergência vai para a autora ou para o coordenador. Se uma descrição
   mudar, mudam juntos `criterios-de-julgamento-sem-predicado.json` (F-11 e as linhas das outras).
7. **Classes NAT-71 por dois classificadores cegos** para as 12 semeadas, com a autora nos desacordos. As naturais
   mantêm as classes da D. Depois, gravar `_meta.classes`.
8. **Conferência de ids contra a base servida.** Seguir o molde de `tela-e2/conferir-ids-base.mjs`, lendo só id,
   texto e fonte de `govbr-ds-validator` na tag `congelado-3.7.12`. Cada id de `rules` das semeadas tem de existir
   com o texto que `clausulas-oraculo.json` ligou. Para a F-12 (`_meta.semIdMapeado`), confirmar que continua sem
   registro. As naturais mantêm a migração da D 1.1.0.
9. **Fechar e congelar.**
   - Tirar "RASCUNHO" de `_meta.status` e preencher `_meta.evidencia` (construção e re-medida) e `_meta.auditoria`.
   - Rodar `npx tsx tela-d/classes-d156.ts --referencia ground-truth-processos-f.json --saida tela-f/classes-d156-1.0.0.json`.
     O teste a seco no rascunho deu as 12 semeadas como `ds`, com 13 ds e 8 geral entre as 21 não expostas.
   - Rodar `node tela-f/niveis.mjs --selar`, que grava o sha256 da referência congelada.
   - Preencher o sha256 da referência em `criterios-de-julgamento-sem-predicado.json` e em `sem-id-mapeado-1.0.0.json`.
   - Gravar `ground-truth-processos-f.sha256`.
   - Rodar `regraDaTela`/`conferirNiveis` do ramo `bancada-f` sobre a referência final.
   - Fazer um commit só com isso.
