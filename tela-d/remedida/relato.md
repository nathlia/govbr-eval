# Tela D (processos): re-medida independente (segundo agente)

**Objeto:** `ground-truth-processos.json` `1.0.0-candidata` (govbr-eval `288fd5d`), na árvore congelada
`govbr-corpus/public/pnip-d/`. Conferi `public/` e `dist/` contra `pnip-d/manifesto.json`: 190/190 arquivos
iguais nas duas, nenhum fora, sha256 do manifesto `2e99f410…2032`. Entrada
`/pnip-d/portal-mpa/processos?mock-perfil=mpa`. Paradas `inicial` e `lista-exibir`, com a receita congelada de
`_meta.setup`.

**Código:** `base.mjs` e `remedir.mjs`, escritos do zero. Usam só Playwright e Node, com servidor estático
próprio, seletor `>>>` próprio (estrito, com conferência larga), contraste próprio, CDP/AX e Tab real (300 ms e a
lista presente depois de cada tecla). Nada foi importado nem copiado de `tela-d/*.mjs` ou `tela-b/**`. Não abri
nem rodei oráculo/validator, axe, comparadores, scorers, fonte ou README do pnip-mock, govbr-resultados nem saídas
de execução. Li `tela-d/evidencia/*.json` só **depois** de medir, para comparar.

**Condições:** 1280×900, Chromium headless do Playwright do govbr-eval, `pt-BR`, `America/Sao_Paulo`, Node
25.2.1. Toda saída foi abortada: 0 externos, 0 escritas (não-GET), 0 caminhos não servidos.

**Determinismo:** rodei 2×. Os dois `resultado.json` são idênticos byte a byte (sha256
`2024d517…bc56`).

## Resultado

| | Confirmados / total |
|---|---|
| Specs | **14/14** |
| Unidades | **60/60** (56/56 sem as expostas D-11…D-14) |
| Controles conformes | **12/12** |
| Paradas (path) | 2/2; as 26 âncoras têm a mesma contagem nas duas paradas (aditividade). O seletor estrito e o largo dão a mesma contagem em todas. |

## Divergências do auditor

**Nenhuma.** Nenhum fato, contagem, seletor, contraste, tamanho de alvo, alcance por Tab ou destino de clique
difere do que a referência e `tela-d/evidencia/` registram. Os valores re-medidos:

- D-01: 18 botões (9 "Ver processo" e 9 "Desassociar", 8 deles desabilitados). Nenhum tem `label` ou `circle`. Todos são `br-button middle` 72×40 com raio 1680px, sem texto visível. O nome vem do `title` (fonte AX `attribute:title`). Os 3 "Assinar" mostram o texto.
- D-02: 9 `<a role=button>` sem `href` e sem atributo `tabindex`, com `cursor:pointer`. A AX não os marca focáveis e nenhum é alcançado pelo Tab real. O clique leva a `…/documentos` nas linhas 2, 3, 4, 6, 7 e 9, e a `/pnip-d/login` com recarga nas linhas 1, 5 e 8. O "Ver processo" nunca abre `/documentos`.
- D-03: 7 `span` (`tabIndex` −1, sem role, AX `generic` com nome ""). Nenhum é alcançado pelo Tab e nenhum aceita `focus()`. "Meus processos" faz a lista passar de 9 para 10 linhas. Os 6 filtros abrem opções.
- D-04: 7 checkboxes (1 no cabeçalho e 6 nas linhas), com labels 0 e nome AX "". Os 7 são alcançados pelo Tab.
- D-05: `#search`, sem `label` no hospedeiro, labels 0. O nome AX "Pesquise aqui ..." vem do placeholder. `#total`/`#page` têm rótulo.
- D-06: orange-vivid-40 `#e66f0e` 3,16:1 (5), indigo-vivid-40 `#8289ff` 3,01:1 (1), secondary-06 `#888888` 3,54:1 (2). Texto branco, 14px/500.
- D-07: sem `caption`, `aria-label`, `aria-labelledby` ou `summary`; nome AX "".
- D-08: `th scope=col` vazio, `columnheader` com nome "".
- D-09: "Buscar", "Exibir lista" e "Exibir lista", todos 32×32.
- D-10: `iframe` sem src, title, name ou aria-label, com `about:blank` e body vazio, 1160×500, AX `Iframe` com nome "". É o 39º Tab, logo depois do "Voltar". Focado: outline `none` (3px), sem sombra, `:focus-visible` falso. Depois dele o Tab alterna iframe ↔ body. Shift+Tab a partir dele vai para "Voltar".
- D-11: 0 âncoras `#` e 0 skiplink nas 2 paradas. O 1º Tab é o botão "Menu" do `br-header`.
- D-12: só o `h2 "Processos"` (AX nível 2) nas 2 paradas, sem `role=heading`.
- D-13: `PNIP` nas 2 paradas.
- D-14: avatar "U" `#ffffff` sobre `#ff8c00` = 2,33:1, 24.192px/700.
- Controles: K-01 "Home" `tabIndex` 0, alcançado pelo Tab. K-02 2 `li` em `ul`. K-03 6,72:1. K-04 outline `dashed 4px rgb(194,133,12)` no foco por Tab. K-05 3 `button` `tabIndex` 0, os 3 alcançados pelo Tab, Enter ≡ clique 3/3. K-06 7×5,9:1. K-07 3× "Assinar" visível, 106×40. K-08 6,49:1 (`#4a50c4`). K-09 `tabIndex` −1, span interno AX `none`/ignorado, fora do Tab. K-10 4 rádios com `label for` (labels 1). K-11 hover com gradiente no `br-item` inteiro; o clique no canto superior direito, fora da caixa do texto, escolhe 25/50/100. K-12 padding 16px nos 4 lados dos 4 itens.

## Notas (não são divergências; ficam para a autora)

1. **D-02:** a propriedade `a.tabIndex` vale **0** no Chromium, embora o elemento não tenha atributo, não esteja na ordem do Tab e a AX não o marque focável. A referência fala do atributo, então está correta. Só evitar ler "tabIndex 0" como "focável".
2. **K-01:** o Tab real faz **duas paradas** no item Home do breadcrumb: o `<a>` e, logo depois, um `button.br-button.small.circle` dentro dele, sem nome próprio (`aria-label=""`). O controle (link alcançado) se confirma. O botão interno é código do web component (`_meta.fundo` já cita o "botão Home do breadcrumb"). Registro aqui porque um agente pode alegar "controle interativo aninhado".
3. **K-11:** o item 0 ("10") já está selecionado, então o clique nele não mostra troca (o valor continua 10). A troca foi demonstrada nos outros 3 itens. O auditor testou só o "25".
4. **K-05:** o `is-active` dos `br-tab-item` não muda no DOM depois da troca de aba. A equivalência Enter ≡ clique foi medida pelo conteúdo da lista (1ª linha e número de linhas), igual nas três abas.
5. **Erros de console:** só aparecem nas cargas auxiliares que saem da rota, depois do clique em número de processo ou em "Ver processo", nas rotas de detalhe (fora do escopo). A carga das duas paradas não registrou erro nem externo.
6. A árvore de trabalho do govbr-eval tem uma mudança que não é minha (`scripts/reanalise-nat74/test-v110.ts`). Não mexi nela. Nada commitado.
