# Documentação do nível a — tela D, cinco specs (condição da autora, 16/11/2026)

A autora decidiu nível a para D-04, D-06, D-08, D-12 e D-14 com uma condição: antes de fechar a
classificação, cada uma precisa ter documentados a ferramenta e a versão exata, o id da regra, como o
predicado da regra corresponde ao que a spec cobra, e as referências aos testes positivos e negativos
da própria ferramenta para essa regra (NAT-71 §3.2: "há predicado em ferramenta, com positivos e
negativos que passam"). Este arquivo cumpre essa condição.

**O que este arquivo não diz.** Nível a diz que o predicado existe numa ferramenta e é testado por ela.
Não diz que a ferramenta detecta a spec na página da tela D. Nada aqui foi medido na página da D: a
página não foi aberta, nenhum scanner rodou contra ela, nenhum modelo rodou. Quem responde se a
ferramenta detecta é a linha de base medida (protocolo NAT-78 §5.4).

## Ferramentas e versões (valem para as cinco specs)

O predicado das cinco é uma regra do axe-core. O axe-core entra no estudo por dois caminhos, em
versões diferentes. As duas foram conferidas.

| Caminho no estudo | Pacote | Versão exata | Onde está fixada |
|---|---|---|---|
| Linha de base axe do govbr-eval (`scripts/run-baselines-flow.ts`, `new AxeBuilder({ page }).analyze()`, configuração padrão) | `@axe-core/playwright` 4.11.1, que resolve `axe-core` `~4.11.1` para **axe-core 4.11.4** | 4.11.4 | `govbr-eval/package-lock.json`, `node_modules/axe-core`: `resolved` `axe-core-4.11.4.tgz`, `integrity` `sha512-KunSNx+TVpkAw/6ULfhnx+HWRecjqZGTOyquAoWHYLRSdK1tB5Ihce1ZW+UY3fj33bYAFWPu7W/GRSmmrCGuxA==`; instalado: `govbr-eval/node_modules/axe-core/package.json` = 4.11.4 |
| Oráculo (`govbr-ds-validator` 3.7.12, `src/checkers/axe.ts`, `axe.run` com `resultTypes` violations/passes/incomplete) | `axe-core` (`^4.10.0` no `package.json`) | **4.12.1** | `govbr-ds-validator/package-lock.json`, `node_modules/axe-core`: `resolved` `axe-core-4.12.1.tgz`, `integrity` `sha512-s7iGf5GaVMxEG0ENN9x+xTr7GFZCb1ZP/1uATUpCEK2X78nDB3RwbtFCo9pGAf9ru+VwoQ464DkaLEeRM08wJA==`; instalado = 4.12.1 |

Nas duas versões, a definição das quatro regras usadas abaixo (seletor, `matches`, checks, opções) é a
mesma; as posições no `axe.js` instalado estão em cada seção.

**Testes.** O pacote npm do axe-core não traz testes (só `axe.js`, `axe.min.js`, `axe.d.ts`,
`locales/`, licenças). Os testes citados estão no repositório upstream `dequelabs/axe-core`, nas tags
`v4.11.4` (commit `dfbc245856cc78289e74195ec1ef04bb33f60ffd`) e `v4.12.1` (commit
`5d002cca1f862a0699d9f1bb7b5a1ec334fa1b22`). Cada caminho abaixo foi aberto pela API do GitHub nas duas
tags em 16/11/2026 e lido. Entre as duas tags, os arquivos de fixture de integração (`.html`/`.json`)
são idênticos byte a byte; os arquivos de teste unitário mudaram só de estilo (`function` → arrow
function), com os mesmos nomes de caso. **Status: não conferido localmente** — os testes não foram
executados nesta máquina; o que se conferiu é que existem, naquelas tags, com os casos citados.

**Regras só best-practice.** `empty-table-header` (D-08) e `page-has-heading-one` (D-12) têm a tag
`best-practice` e nenhuma tag de critério WCAG. O predicado existe e é testado; o que muda é o peso
normativo que a ferramenta dá ao resultado. No oráculo 3.7.12, regra só best-practice sai como sinal de
revisão, não como violação afirmada (`govbr-ds-validator/src/checkers/axe.ts`, comentário 3.4.4/C10a e
`kind: "axe-best-practice"`). Isso não altera o nível a, que é sobre o predicado; fica declarado.

---

## D-04

- **Ferramenta e versão:** axe-core 4.11.4 (linha de base) e 4.12.1 (oráculo).
- **Regra:** `label` (tags `cat.forms`, `wcag2a`, `wcag412`, ...). Definição: `govbr-eval/node_modules/axe-core/axe.js` linha 32029 (4.11.4); `govbr-ds-validator/node_modules/axe-core/axe.js` linha 32566 (4.12.1).
- **Predicado da regra:** aplica-se a `input, textarea` filtrados por `label-matches` (exclui só tipos de botão e `hidden`; `checkbox` fica dentro). Passa se qualquer um dos checks der nome: `implicit-label`, `explicit-label`, `aria-label`, `aria-labelledby`, `non-empty-title` (atributo `title`), `non-empty-placeholder` (atributo `placeholder`), `presentational-role`; falha também com `none: hidden-explicit-label`.
- **Correspondência com a spec:** a spec cobra controles `<input type="checkbox">` sem `<label>` associado, sem `aria-label`, sem `aria-labelledby` e sem `title`, com nome vazio. Cada uma dessas ausências é a negação de um check do `any` da regra; o tipo `checkbox` está no escopo da regra. Os dois checks que a spec não menciona (`placeholder`, papel de apresentação) não se aplicam ao que ela descreve. Correspondência direta.
- **Testes positivos (a regra acusa):** `test/integration/rules/label/label.html` + `label.json`, `violations` `#fail1`…`#fail14` (ex.: `#fail1` input sem nenhum rótulo; `#fail3`/`#fail5` rótulo vazio). Unitários: `test/checks/label/explicit.js` e `test/checks/label/implicit.js`, caso "returns false if a label is not present".
- **Testes negativos (a regra não acusa):** mesmo fixture, `passes` `#pass1`…`#pass17` (`aria-label`, `aria-labelledby`, `<label>` implícito e explícito, `title`, papel de apresentação). Unitários: "returns true if a non-empty label is present" em `explicit.js` e `implicit.js`.
- **Escopo do tipo checkbox:** os casos de integração usam `type="text"` e `textarea`; o tipo `checkbox` dentro do escopo é testado em `test/rule-matches/label-matches.js`, caso "returns true for other input types" (lista `text, password, url, range, date, checkbox, radio`).
- **Como foi verificado:** definição da regra lida no `axe.js` instalado das duas versões; testes lidos no upstream nas duas tags pela API do GitHub; não executados (não conferido localmente).
- **Situação:** documentação completa.

## D-06

- **Ferramenta e versão:** axe-core 4.11.4 e 4.12.1.
- **Regra:** `color-contrast` (tags `cat.color`, `wcag2aa`, `wcag143`, ...). Definição: `axe.js` linha 31653 (4.11.4); linha 32190 (4.12.1).
- **Predicado da regra:** para elementos com texto (`color-contrast-matches`), calcula a razão de contraste entre a cor do texto e o fundo efetivo e exige `contrastRatio.normal.expected = 4.5`, ou `large.expected = 3` quando o texto é grande (`largeTextPt: 18`, ou negrito `boldValue: 700` com `boldTextPt: 14`). Quando não consegue determinar o fundo, devolve `incomplete` (revisão), não violação.
- **Correspondência com a spec:** a spec cobra razão de contraste abaixo de 4,5:1 (WCAG 1.4.3) em texto de 14 px, peso 500 — texto normal pelo critério da regra, limiar 4,5. Os valores medidos na referência (todos < 4,5) caem no lado de falha do predicado; o item da mesma família que passa (> 4,5) cai no lado de aprovação. Correspondência direta. Fica declarado: um fundo que a regra não resolva sai como `incomplete`, o que é questão de detecção, não de predicado.
- **Testes positivos:** `test/integration/rules/color-contrast/color-contrast.html` + `color-contrast.json`, `violations` `#fail1`, `#fail2`, `#fail3`, `#fail6`…`#fail12` (ex.: `#fail1` texto branco sobre cinza a 20 px). Unitários: `test/checks/color/color-contrast.js`, casos "should return false when there is not sufficient contrast between foreground and background" e "should return false when there is not sufficient contrast because of font weight".
- **Testes negativos:** mesmo fixture, `passes` `#pass1`…`#pass24` (ex.: `#pass1` preto sobre branco); unitário "should return true when there is sufficient contrast" e os casos de contraste suficiente por peso e tamanho de fonte. O mesmo fixture também testa `incomplete` (`#canttell1`…`#canttell23`).
- **Como foi verificado:** como em D-04.
- **Situação:** documentação completa.

## D-08

- **Ferramenta e versão:** axe-core 4.11.4 e 4.12.1.
- **Regra:** `empty-table-header` (tags `cat.name-role-value`, `best-practice`; sem critério WCAG). Definição: `axe.js` linha 31785 (4.11.4); linha 32322 (4.12.1).
- **Predicado da regra:** aplica-se a `th:not([role]), [role="rowheader"], [role="columnheader"]`; passa se o check `has-visible-text` for verdadeiro, isto é, se o texto da subárvore, sanitizado, não for vazio.
- **Correspondência com a spec:** a spec cobra um `<th scope="col">` vazio, sem nome na árvore de acessibilidade. O elemento está no seletor da regra (`th` sem `role`) e não tem texto visível, logo falha `has-visible-text`. Correspondência direta para o que a spec descreve. Fica declarado: o predicado da regra é "sem texto visível", e não "sem nome acessível"; no caso descrito pela spec os dois coincidem. A regra é só best-practice (ver acima); a spec cita WCAG 1.3.1, a ferramenta não.
- **Testes positivos:** `test/integration/rules/empty-table-header/empty-table-header.html` + `.json`, `violations` `#fail1` (`<th>` vazio), `#fail2`, `#fail3` (cabeçalhos por papel com texto oculto). Unitários: `test/checks/shared/has-visible-text.js`, casos "should return false if there is no visible text" e "should return false if there is text, but its hidden".
- **Testes negativos:** mesmo fixture, `passes` `#pass1` (`<th>` com texto), `#pass2`, `#pass3`; unitário "should return true if there is visible text".
- **Como foi verificado:** como em D-04.
- **Situação:** documentação completa.

## D-12

- **Ferramenta e versão:** axe-core 4.11.4 e 4.12.1.
- **Regra:** `page-has-heading-one` (tags `cat.semantics`, `best-practice`; sem critério WCAG). Definição: `axe.js` linhas 32344 e 32788 (4.11.4); 32882 e 33326 (4.12.1).
- **Predicado da regra:** aplica-se ao documento de topo (`html:not(html *)`); o check `page-has-heading-one` (`has-descendant-evaluate` + `has-descendant-after`) procura, na árvore virtual do axe, um elemento visível para leitor de tela que case com `h1:not([role], [aria-level]), :is(h1, h2, h3, h4, h5, h6):not([role])[aria-level=1], [role=heading][aria-level=1]`; o resultado agrega os frames (basta um ter). Passa também se houver modal aberto (`passForModal: true`).
- **Correspondência com a spec:** a spec cobra a ausência de qualquer título de nível 1 na página inteira (DOM e shadow roots), com um só título de nível 2. Isso é a negação do predicado da regra. Correspondência direta para a ausência. Fica declarado: a regra não julga ordem nem hierarquia além da existência de um nível 1; a spec, pela descrição, cobra a ausência. A regra é só best-practice; a spec cita WCAG 1.3.1, a ferramenta não. A cobertura de shadow roots é a da árvore virtual do axe (`query_selector_all_filter`), não conferida contra a página da D, por regra desta tarefa.
- **Testes positivos:** `test/integration/full/page-has-heading-one/page-has-heading-one-fail.html` + `page-has-heading-one-fail.js` (página sem `h1` válido, com `h1` neutralizados por `role`/`aria-level`, e um frame sem `h1`; espera violação em `#fail1` e no frame).
- **Testes negativos:** mesma pasta, `page-has-heading-one-pass1.html`/`.js` até `page-has-heading-one-pass10.html`/`.js` (ex.: `pass1`, `h1` só dentro de um frame aninhado, e a regra passa); a subpasta `frames/` traz os documentos aninhados.
- **Como foi verificado:** como em D-04 (lidos `-fail` e `-pass1`; a existência de `-pass2`…`-pass10` foi conferida pela listagem da pasta nas duas tags).
- **Situação:** documentação completa.

## D-14

- **Ferramenta e versão:** axe-core 4.11.4 e 4.12.1.
- **Regra:** `color-contrast` (mesma definição de D-06).
- **Predicado da regra:** o de D-06. Texto grande (≥ 18 pt, ou negrito ≥ 700 e ≥ 14 pt ≈ 18,67 px) usa limiar 3:1.
- **Correspondência com a spec:** a spec cobra contraste de 2,33:1 num texto de 24,2 px, peso 700 — texto grande pelo critério da regra, limiar 3:1. 2,33 < 3, logo cai no lado de falha (cairia também com o limiar 4,5). Correspondência direta.
- **Testes positivos:** os de D-06, e em particular `#fail3` do fixture de integração (texto branco sobre amarelo a 40 px: texto grande que falha) e o unitário "should support options.boldTextPt".
- **Testes negativos:** os de D-06, e em particular `#pass2` (texto branco sobre cinza a 40 px: texto grande que passa pelo limiar 3:1) e os unitários "should return true when there is sufficient contrast because of font weight" / "because of font size".
- **Como foi verificado:** como em D-04.
- **Situação:** documentação completa.

---

## Resumo

| Spec | Regra | Positivos | Negativos | Situação |
|---|---|---|---|---|
| D-04 | `label` | sim | sim | completa |
| D-06 | `color-contrast` | sim | sim | completa |
| D-08 | `empty-table-header` | sim | sim | completa |
| D-12 | `page-has-heading-one` | sim | sim | completa |
| D-14 | `color-contrast` | sim | sim | completa |

Cinco de cinco com documentação completa; nenhuma `documentacao-incompleta`. Ressalva comum: testes
conferidos no upstream nas tags exatas, **não executados localmente**.
