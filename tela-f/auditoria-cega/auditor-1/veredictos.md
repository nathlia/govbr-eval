# Auditoria da tela F — auditor 1

Página servida da build `.tmp-eval/pnip-f-semeada` em http://127.0.0.1:3431/pnip-f/portal-mpa/processos?mock-perfil=mpa (Chromium headless, 1280×900, America/Sao_Paulo). Cada afirmação foi medida a partir de um carregamento novo; os seletores com `>>>` foram resolvidos entrando no shadowRoot do hospedeiro.

**Contagem:** verdadeira 12 · falsa 12 · indecidível 0. Cláusulas que não conferem: 0. Violação incerta: 0.

| id | veredito | cláusula confere | viola cláusula |
|---|---|---|---|
| A-01 | falsa | sim | — |
| A-02 | falsa | sim | — |
| A-03 | falsa | sim | — |
| A-04 | falsa | sim | — |
| A-05 | verdadeira | sim | sim |
| A-06 | verdadeira | sim | sim |
| A-07 | falsa | sim | — |
| A-08 | falsa | sim | — |
| A-09 | verdadeira | sim | sim |
| A-10 | falsa | sim | — |
| A-11 | verdadeira | sim | sim |
| A-12 | verdadeira | sim | sim |
| A-13 | verdadeira | sim | sim |
| A-14 | verdadeira | sim | sim |
| A-15 | falsa | sim | — |
| A-16 | falsa | sim | — |
| A-17 | verdadeira | sim | sim |
| A-18 | falsa | sim | — |
| A-19 | verdadeira | sim | sim |
| A-20 | verdadeira | sim | sim |
| A-21 | falsa | sim | — |
| A-22 | verdadeira | sim | sim |
| A-23 | falsa | sim | — |
| A-24 | verdadeira | sim | sim |

## A-01 — falsa

- **Medida:** div.pagination-information color = rgb(51, 51, 51), e os 3 spans internos também rgb(51, 51, 51); rótulos 'Exibir' e 'Página' = rgb(51, 51, 51). Nenhum texto do bloco em rgb(19, 81, 180).
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** Afirmação clara; o texto tem a mesma cor dos rótulos.

## A-02 — falsa

- **Medida:** 9 células td:nth-of-type(4): white-space normal, overflow visible, text-overflow clip; scrollWidth = clientWidth = 131; altura 105–145 px (texto quebra em 3–5 linhas, ex.: 'CAOL - Cert. Acred Origem Legal do Pescado').
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** O texto quebra em várias linhas; não há corte.

## A-03 — falsa

- **Medida:** 9 links td:nth-of-type(3) a: color = rgb(19, 81, 180) (#1351b4) em todos; nenhum em rgb(0, 94, 162).
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** #1351B4 = --blue-warm-vivid-70 segundo cores.md.

## A-04 — falsa

- **Medida:** input#total (Exibir): borda 1px solid rgba(0, 0, 0, 0) em todos os lados, box-shadow none, outline none; input#page (Página): idem (1px solid rgba(0, 0, 0, 0)). Nenhuma borda rgb(136, 136, 136).
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** Os dois campos estão iguais e sem contorno visível.

## A-05 — verdadeira

- **Medida:** span.br-tag.interaction 'Meus processos': border-radius 16783.2px nos 4 cantos (pílula, 179×32); as 6 tags de filtro da barra (Aberto há, Tipo de processo, Status, Espécie alvo, Método de pesca, Petrecho): border-radius 4px.
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** Trecho com '[…]' confere: o título está na linha 426 e a linha da Superfície na 430, na mesma seção. A tag de interação pede --surface-rounder-sm; o arredondamento em pílula é outro token (--surface-rounder-pill, usado nas tags de ícone/status). O valor em px dos tokens não está no corpus.

## A-06 — verdadeira

- **Medida:** Campo (input no shadow de br-input): y 402.3–434.3 (h 32), centro 418.3. Botão 'Buscar': y 430.3–462.3 (32×32), centro 446.3 → 28 px abaixo do centro do campo. Ícone da lupa: y 438.3–454.3, começa 4 px abaixo da borda inferior do campo. Estilo do botão: margin-top -12px (inline), transform translateY(4px).
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** 28 px fica dentro da faixa 26–28. A ação interna deveria estar centralizada verticalmente no campo.

## A-07 — falsa

- **Medida:** Depois de clicar em input#total, .br-list ganha o atributo expanded, display block, position absolute, z-index 1, 70×212 px; box-shadow = rgba(0, 0, 0, 0.16) 0px 3px 6px 0px (não none).
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** A lista aberta tem sombra.

## A-08 — falsa

- **Medida:** br-button[label=Exportar] >>> button: border-radius 1680px nos cantos (pílula), 117.7×40.
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** Exportar tem forma de pílula, não cantos de 4 px.

## A-09 — verdadeira

- **Medida:** Após Aberto há → 'Últimos 60 dias' aparece a tag span.br-tag.interaction (row pl-2), 215×32 em x 92. Os filhos, na ordem do DOM e na tela (inline-flex, row, order 0): button.br-button.inverted.circle (×) em x 116–144; ícone fa-clock em x 144–168; rótulo em x 172–295. O botão de fechar está à esquerda, antes do ícone e do rótulo.
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** Tabela 'Alinhamento [tag de Interação]' (linhas 284–291): ícone à esquerda e botão terciário à direita. A tag fica acima da barra de filtros (y 382; as tags de filtro descem para y 418+).

## A-10 — falsa

- **Medida:** th:nth-of-type(8) 'Status': background-color rgb(240, 240, 240).
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** O fundo é cinza, não branco. (A célula branca do cabeçalho é a 7ª, 'Téc. Adm.')

## A-11 — verdadeira

- **Medida:** br-button[label='Limpar filtros'] >>> button: text-transform uppercase; innerText renderizado 'LIMPAR FILTROS' (textContent 'Limpar filtros').
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** 'Padrão' na tabela de Tipografia é o tipo Botão Padrão (não circular), que é o caso deste botão com rótulo; o valor pedido é text-transform none.

## A-12 — verdadeira

- **Medida:** th:nth-of-type(7) 'Téc. Adm.': background-color rgb(255, 255, 255); os outros 8 th: rgb(240, 240, 240).
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** --gray-5 = #F0F0F0 = rgb(240, 240, 240) segundo cores.md; a célula branca destoa.

## A-13 — verdadeira

- **Medida:** Contêiner div.d-flex.justify-content-end: margin-top -20px. Botão 'Voltar': x 1090.8–1188.1, y 1662.5–1702.5. Caixa do br-select-pnip 'Página': x 1040–1179.7, y 1642.5–1682.5 → sobreposição de 88.9×20 px; com o input#page (y 1646.5–1678.5) a sobreposição é de 88×16 px. Na zona sobreposta, elementFromPoint devolve o botão Voltar (ele cobre a parte de baixo do campo 'Página').
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** Não há espaço entre as áreas; elas se sobrepõem.

## A-14 — verdadeira

- **Medida:** Com a lista 'Exibir' aberta, .br-item.selected ('10'): background-color rgb(19, 81, 180), color rgb(255, 255, 255) (label também branco). Itens não selecionados: fundo branco, texto rgb(51, 51, 51).
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** select__designer.md diz que cada item selecionado assume o estado selecionado; a especificação desse estado (estados.md, linha 430) é --blue-warm-vivid-50 (#2670E8). O medido é #1351B4 (--blue-warm-vivid-70).

## A-15 — falsa

- **Medida:** Tag 'Tipo de processo' (nth-child(2)): border-radius 4px nos 4 cantos, 213.6×32.
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** Tem cantos de 4 px, como as outras tags de filtro.

## A-16 — falsa

- **Medida:** Tag 'Status' (nth-child(3)): altura 32 px (127.4×32), igual às vizinhas (todas 32 px); o rótulo 'Status' ocupa 1 linha (1 retângulo de texto, 24.3 px de altura).
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** Não fica mais alta que 32 px e o texto não quebra.

## A-17 — verdadeira

- **Medida:** 9 células td:nth-of-type(5): white-space nowrap, overflow hidden, text-overflow clip; clientWidth 120 e scrollWidth 187–454 (todas cortadas). O corte cai dentro de 'Exemplo' (aparece 'Pessoa Exemp'), sem reticências. title null em todas as células e descendentes, sem aria-describedby; passar o mouse (1.2 s) não cria nenhum elemento tooltip/popover/role=tooltip.
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** Sem reticências e sem tooltip, ao contrário do que a documentação pede.

## A-18 — falsa

- **Medida:** 3 botões br-button[title=Assinar] >>> button: border-radius 1680px (pílula), 105.5×40.
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** Os botões Assinar têm forma de pílula.

## A-19 — verdadeira

- **Medida:** pnip-header .br-avatar .content ('U'): 40×40, border-radius 4px nos 4 cantos, fundo rgb(255, 140, 0), overflow hidden; o pai .br-avatar tem raio 0. É um quadrado de cantos 4 px.
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** A superfície deveria ser circular.

## A-20 — verdadeira

- **Medida:** 81 células tbody td: padding-top 12px / padding-bottom 12px (todas). 9 th do cabeçalho: 16px / 16px.
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** A documentação dá às linhas --spacing-scale-base (alta), -2x (padrão) e -3x (baixa); o cabeçalho é -2x em todas as densidades. Os 16 px medidos no cabeçalho indicam 2x = 16, logo base = 8 e 3x = 24; 12 px não bate com nenhuma densidade. Os valores em px dos tokens não estão escritos no corpus.

## A-21 — falsa

- **Medida:** br-button[label=Exportar] >>> button: padding-left 24px, padding-right 24px.
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** As margens internas laterais são de 24 px, não 8 px.

## A-22 — verdadeira

- **Medida:** button.br-button.secondary 'Voltar': border-radius 4px (97.3×40). 'Exportar' (br-button, secundário): border-radius 1680px (pílula).
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** Botão Padrão com rótulo; a superfície deveria usar --surface-rounder-pill.

## A-23 — falsa

- **Medida:** br-button[label=Exportar] >>> button: text-transform none; innerText renderizado 'Exportar'.
- **Cláusula confere:** sim; **viola:** — (fato falso)
- **Nota:** O rótulo não está em caixa alta.

## A-24 — verdadeira

- **Medida:** Depois de clicar na tag 'Aberto há', div.br-select > div.br-list: display block, position absolute, z-index 1, fundo branco, 155×148 em y 418–566 (sobre as tags de filtro e o topo da tabela); box-shadow none, filter none. Itens: Últimos 7/30/60/90 dias.
- **Cláusula confere:** sim; **viola:** sim
- **Nota:** A lista flutua sem nenhuma sombra (captura aberto-ha-aberto.png).

## Arquivos

- `servidor.mjs` (servidor estático, porta 3431), `comum.mjs`, `sonda.mjs`, `html.mjs`, `medir-estatico.mjs`, `medir-interacao.mjs`, `checar-a16.mjs`, `gerar-md.mjs`
- Medidas brutas: `medidas-estatico.json`, `medidas-interacao.json`
- Capturas: `inicial.png`, `exibir-aberto.png`, `aberto-ha-aberto.png`, `tag-60-dias.png`, `apos-60-dias.png`, `voltar-pagina.png`, `hover-solicitante.png`
