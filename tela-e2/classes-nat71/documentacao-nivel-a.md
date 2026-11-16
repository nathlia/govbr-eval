# Documentação do nível a — tela E, duas specs (NAT-71 §3.2, 16/11/2026)

Os dois classificadores cegos deram nível a a U-04 e U-07, em acordo (`comparacao.md`). A NAT-71 §3.2
define o nível a como "há predicado em ferramenta, com positivos e negativos que passam". Os dois
classificadores nomearam a ferramenta e a regra, mas deixaram versão e testes "a verificar". Este
arquivo documenta, para cada uma, a ferramenta e a versão exata, o id da regra, como o predicado da
regra corresponde ao que a spec cobra, e as referências aos testes positivos e negativos da própria
ferramenta para essa regra, naquela versão, no mesmo modelo usado para a tela D
(`tela-d/classes-nat71/documentacao-nivel-a.md`).

**O que este arquivo não diz.** Nível a diz que o predicado existe numa ferramenta e é testado por ela.
Não diz que a ferramenta detecta a spec na página da tela E. Nada aqui foi medido na página da E: a
página não foi aberta, nenhum scanner rodou contra ela, nenhum modelo rodou, o oráculo não foi chamado.
Quem responde se a ferramenta detecta é a linha de base medida (protocolo NAT-78 §5.4).

**Mesma ferramenta e mesma regra nos dois classificadores.** U-04: os dois nomeiam Stylelint, regra core
`declaration-property-value-allowed-list`, com a mesma configuração (`{ "font-family": ["/^Rawline/"] }`).
U-07: os dois nomeiam axe-core, regra `color-contrast`. Não há divergência de ferramenta nem de regra.

## Ferramentas e versões

As duas specs usam ferramentas diferentes. As versões foram tiradas dos `package-lock.json` e
conferidas no `node_modules` instalado em 16/11/2026.

| Spec | Caminho no estudo | Pacote | Versão exata | Onde está fixada |
|---|---|---|---|---|
| U-07 | Linha de base axe do govbr-eval (`scripts/run-baselines-flow.ts`, `new AxeBuilder({ page }).analyze()`, configuração padrão) | `@axe-core/playwright` 4.11.1, que resolve `axe-core` `~4.11.1` para **axe-core 4.11.4** | 4.11.4 | `govbr-eval/package-lock.json`, `node_modules/axe-core`: `resolved` `axe-core-4.11.4.tgz`, `integrity` `sha512-KunSNx+TVpkAw/6ULfhnx+HWRecjqZGTOyquAoWHYLRSdK1tB5Ihce1ZW+UY3fj33bYAFWPu7W/GRSmmrCGuxA==`; instalado: `govbr-eval/node_modules/axe-core/package.json` = 4.11.4 |
| U-07 | Oráculo (`govbr-ds-validator` 3.7.12, tag `congelado-3.7.12`, `src/checkers/axe.ts`, `axe.run` com `resultTypes` violations/passes/incomplete) | `axe-core` (`^4.10.0` no `package.json`) | **4.12.1** | `govbr-ds-validator/package-lock.json`, `node_modules/axe-core`: `resolved` `axe-core-4.12.1.tgz`, `integrity` `sha512-s7iGf5GaVMxEG0ENN9x+xTr7GFZCb1ZP/1uATUpCEK2X78nDB3RwbtFCo9pGAf9ru+VwoQ464DkaLEeRM08wJA==`; instalado = 4.12.1 |
| U-04 | Comparador L do govbr-eval (Stylelint normativo, NAT-76, `comparadores/lint.ts`; protocolo NAT-78 §5.4) | `stylelint` (`17.16.0` exato no `package.json`) | **17.16.0** | `govbr-eval/package-lock.json`, `node_modules/stylelint`: `resolved` `stylelint-17.16.0.tgz`, `integrity` `sha512-ejlWnbJ13x1GU32+zZXa6sYQJsKKkwSdv2B4rAdO3OWdEmvhSJKcXi5pOphQYSzyaj1kXpuGJr7pcMBNfDIuPw==`; instalado: `govbr-eval/node_modules/stylelint/package.json` = 17.16.0 |

O `govbr-ds-validator` não tem Stylelint entre as dependências; o Stylelint só entra no estudo pelo
comparador L do govbr-eval.

**Testes.** Nenhum dos dois pacotes npm traz os testes das regras (o axe-core publica só `axe.js`,
`axe.min.js`, `axe.d.ts`, `locales/` e licenças; o Stylelint publica a regra sem a pasta `__tests__`).
Os testes citados estão nos repositórios upstream:

- `dequelabs/axe-core`, tags `v4.11.4` (commit `dfbc245856cc78289e74195ec1ef04bb33f60ffd`) e `v4.12.1`
  (commit `5d002cca1f862a0699d9f1bb7b5a1ec334fa1b22`);
- `stylelint/stylelint`, tag `17.16.0` (commit `bc06c7cdb1413de3d8dc939b33af138ab7e59df1`).

Cada caminho abaixo foi aberto pela API do GitHub nessas tags em 16/11/2026 e lido. **Status: não
conferido localmente** — os testes não foram executados nesta máquina; o que se conferiu é que existem,
naquelas tags, com os casos citados.

---

## U-04

- **Ferramenta e versão:** Stylelint 17.16.0 (comparador L do govbr-eval).
- **Regra:** `declaration-property-value-allowed-list` (regra core). Definição:
  `govbr-eval/node_modules/stylelint/lib/rules/declaration-property-value-allowed-list/index.mjs`; o
  arquivo instalado é idêntico byte a byte ao da tag upstream `17.16.0` (conferido por `diff`).
- **Predicado da regra:** a opção primária é um objeto `{ propriedade: [valores permitidos] }`, em que
  propriedade e valores podem ser texto ou expressão regular (`"/.../"`). Para cada declaração cuja
  propriedade case com uma chave, a regra relata `Disallowed value "<valor>" for property "<prop>"`
  quando o valor da declaração não casa com nenhum dos valores permitidos daquela chave. Declarações de
  propriedades fora das chaves não são julgadas.
- **Correspondência com a spec:** a spec cobra a família tipográfica do campo do código fora da família
  do DS, com a troca semeada como declaração `font-family` na folha da página. Com a configuração que os
  dois classificadores nomeiam (`{ "font-family": ["/^Rawline/"] }`), essa declaração não casa com o
  valor permitido e cai no lado de falha do predicado; a família do DS (valor iniciado por `Rawline`)
  cai no lado de aprovação. A regra de família do DS é global (uma família só), então o escopo global
  da regra não é mais largo que o que a spec cobra. Correspondência direta, com três ressalvas
  declaradas:
  1. **A configuração não está congelada no estudo.** A configuração congelada do comparador L
     (`govbr-eval/comparadores/lint/config.mjs`, plano NAT-76 §3) usa esta mesma regra só para
     `font-size` (N2) e espaçamento (H1); não tem chave `font-family`. O predicado desta spec é, portanto,
     o da regra configurada como os classificadores propõem, não o que o comparador do estudo aplica.
     Isso não muda o nível (nível a é sobre o predicado existir e ser testado na ferramenta, e regra
     Stylelint configurada é o exemplo da própria §3.2), mas diz desde já que a linha de base do
     comparador L, como congelada, não aplica este predicado: questão de detecção, não de predicado.
  2. **A regra lê a declaração, não o estilo computado.** A spec fala em família "declarada e usada", e
     a aceitação da referência é de estilo computado. A regra acusa a declaração que causa o defeito;
     não confere se ela vence a cascata. No caso descrito pela spec as duas coisas coincidem.
  3. **Os testes são da regra genérica.** Os testes upstream exercitam a regra com outras propriedades
     e outros valores (incluindo valor permitido por expressão regular ancorada no início, a mesma
     forma de `/^Rawline/`); não há teste upstream nem local desta configuração com `font-family`.
     Os dois classificadores marcaram U-04 como limítrofe por este motivo.
- **Testes positivos (a regra acusa):**
  `lib/rules/declaration-property-value-allowed-list/__tests__/index.mjs` (tag `17.16.0`), primeiro
  `testRule` com configuração `{ '/^(-webkit-)?transform$/': ['/scale/'], whitespace: 'nowrap',
  '/color/': ['/^green/'] }`, bloco `reject`: cinco casos, entre eles `a { color: pink; }` e
  `a { background-color: pink; }` (valor que não casa com `/^green/`), `div { whitespace: pre; }` e
  `a { transform: translate(1, 1); }`, cada um com a mensagem `messages.rejected(...)` e a posição
  esperadas.
- **Testes negativos (a regra não acusa):** mesmo arquivo, bloco `accept` do primeiro `testRule`
  (cinco casos, ex.: `a { color: green; }` e `a { background-color: green; }`, valor que casa com
  `/^green/`); segundo `testRule` (`{ position: ['static'] }`: declaração de propriedade fora das chaves,
  `a { font-size: 1em; }`, não é julgada); terceiro `testRule` (chave por expressão `/.*/` junto com
  chave literal, `accept`).
- **Testes locais complementares (não são desta configuração):** `govbr-eval/comparadores/testes.ts`
  (`npm run test:comparadores`) testa a mesma regra na configuração N2 (`font-size`), com casos que
  acusam (`N2 15px`) e que não acusam (`N2 16.8px`, `N2 token`, `N2 inherit`). Não executados nesta
  tarefa.
- **Como foi verificado:** versão nos `package-lock.json` e no `node_modules` instalado; regra lida no
  arquivo instalado e comparada com a da tag upstream; arquivo de testes lido no upstream pela API do
  GitHub; não executados (não conferido localmente). Configuração congelada do comparador L lida em
  `comparadores/lint/config.mjs`.
- **Situação:** documentação completa, com a ressalva 1 (configuração `font-family` ausente do
  comparador congelado) e a ressalva 3 (testes da regra genérica, não desta configuração) declaradas.

## U-07

- **Ferramenta e versão:** axe-core 4.11.4 (linha de base) e 4.12.1 (oráculo).
- **Regra:** `color-contrast` (tags `cat.color`, `wcag2aa`, `wcag143`, ...). Definição: `axe.js`
  linha 31653 (regra) e 32714 (check), 4.11.4; linhas 32190 e 33252, 4.12.1. Nas duas versões a regra
  (`matches: 'color-contrast-matches'`, tags) e as opções do check são as mesmas.
- **Predicado da regra:** para elementos com texto (`color-contrast-matches`), calcula a razão de
  contraste entre a cor do texto e o fundo efetivo e exige `contrastRatio.normal.expected = 4.5`, ou
  `large.expected = 3` quando o texto é grande (`largeTextPt: 18`, ou negrito `boldValue: 700` com
  `boldTextPt: 14`). Quando não consegue determinar o fundo, devolve `incomplete` (revisão), não
  violação.
- **Correspondência com a spec:** a spec cobra contraste abaixo de 4,5:1 (WCAG 1.4.3) nos rótulos das
  opções da lista do select, em texto de 14 px, peso 500 — texto normal pelo critério da regra (nem
  ≥ 18 pt, nem negrito ≥ 700), limiar 4,5. A razão registrada na referência (2,32:1) cai no lado de
  falha do predicado. Correspondência direta. Fica declarado: (i) a spec está no estado S2 (lista
  aberta); a regra só julga texto visível, então só vê os rótulos se rodar nesse estado — questão de
  detecção, não de predicado; (ii) um fundo que a regra não resolva sai como `incomplete`; (iii) a
  co-violação de cor fora da paleta que a spec também cita não é julgada por esta regra.
- **Testes positivos (a regra acusa):** `test/integration/rules/color-contrast/color-contrast.html` +
  `color-contrast.json`, `violations` (10): `#fail1`, `#fail2`, `#fail3`, `#fail6`…`#fail12` (ex.:
  `#fail1` texto branco sobre cinza a 20 px; `#fail12` texto `#ccc`). Unitários:
  `test/checks/color/color-contrast.js`, casos "should return false when there is not sufficient
  contrast between foreground and background", "should return false when there is not sufficient
  contrast because of font weight" e "... because of font size".
- **Testes negativos (a regra não acusa):** mesmo fixture, `passes` (25): `#pass1`…`#pass24`,
  `#pass7 > input` e `#text-shadow-fg-pass` (ex.: `#pass1` preto sobre branco); unitário "should return
  true when there is sufficient contrast" e os casos de contraste suficiente por peso e tamanho de
  fonte. O mesmo fixture também testa `incomplete` (`#canttell1`…`#canttell23`).
- **Diferença entre as tags:** os dois arquivos do fixture de integração têm o mesmo blob git nas duas
  tags (`color-contrast.json` `428f9adc…`, `color-contrast.html` `94a34e20…`), logo são idênticos byte a
  byte. O arquivo unitário mudou (`c7e2dd6b…` em `v4.11.4`, `0c634b6b…` em `v4.12.1`): além de estilo, o
  caso "should return true for inline elements with sufficient contrast spanning multiple lines" passou
  a `it.skip` em `v4.12.1`. Os quatro casos citados acima existem com o mesmo nome nas duas tags.
- **Como foi verificado:** definição da regra e do check lida no `axe.js` instalado das duas versões;
  testes lidos no upstream nas duas tags pela API do GitHub; não executados (não conferido localmente).
- **Situação:** documentação completa.

---

## Resumo

| Spec | Ferramenta e versão | Regra | Positivos | Negativos | Situação |
|---|---|---|---|---|---|
| U-04 | Stylelint 17.16.0 | `declaration-property-value-allowed-list` (configurada com `font-family`) | sim (regra genérica) | sim (regra genérica) | completa, com ressalvas declaradas |
| U-07 | axe-core 4.11.4 e 4.12.1 | `color-contrast` | sim | sim | completa |

Duas de duas com documentação completa; nenhuma `documentacao-incompleta`. Ressalva comum: testes
conferidos no upstream nas tags exatas, **não executados localmente**. Ressalva própria de U-04: a
configuração com `font-family` não existe no comparador L congelado do estudo e não tem teste próprio;
o nível não muda, mas a linha de base do comparador L, como congelada, não aplica este predicado.
