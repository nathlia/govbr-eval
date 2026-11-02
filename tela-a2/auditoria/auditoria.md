# Tela A2 ("Acompanhar requerimento") — auditoria cega por medição

**Executada em:** 2026-11-02, por agente LLM (Claude), em contexto novo, **cego** para a construção da tela.
**Status:** passada 1 do auditor cego (não é referência congelada). Nada commitado.

| Arquivo (`govbr-eval/tela-a2/auditoria/`) | O que é |
|---|---|
| `comum.mjs`, `util-navegador.mjs` | condições de medida (lidas só de `../ancoras-neutras.json`) e utilitários injetados na página |
| `observar-360.mjs` → `medidas/observacao-360.json` | observação longa sem interação (360 s) |
| `observar-recarga-estado.mjs` → `medidas/observacao-recarga-estado.json` | complemento: o que a recarga faz com um preenchimento em S1 (330 s) |
| `medir-html-servido.mjs` → `medidas/html-servido.json` | fatos dos bytes HTML servidos |
| `origem.mjs` → `medidas/origem.json` | proveniência por ablação (sem JS / só core.min.js / página inteira) |
| `medir.mjs` → `medidas/S{0,1,2}/{pagina,instancias,contraste,tab,ax}.json` | medida por estado |
| `interagir.mjs` → `medidas/S{0,1,2}/interacoes.json` | 45 sondas de teclado, ponteiro, dimensão |
| `inventariar.mjs` → `inventario.json`, `estados.json` | inventário por estado e estados alcançados |
| `montar-decisoes.mjs` → `decisoes.json`, `achados.json`, `conformes.json`, `incertos.json` | tabela regra × veredito |
| `conferir-auditoria.mjs` | re-mede o predicado de cada achado (N/N) |
| `rodar.mjs` | refaz tudo na ordem |

## 1. Cegueira e exposição

Lidos: `tela-a2/ancoras-neutras.json`; o método e os scripts da tela D (`tela-d/auditoria.md`,
`metodo-auditoria-adendo-processos.md`, `inventariar.mjs`, `selecionar-estados.mjs`, `sequencia.mjs`,
`medida-shadow-root.mjs`, `montar-decisoes.mjs`, `conferir-auditoria.mjs`, `comum.mjs`) e o formato de
`inventario.json`, `estados.json`, `conformes.json`, `decisoes.json` da D; a base literal DS 3.7.0
(`govbr-ds-validator/data/knowledge/versions/3.7.0-literal-2026-10-15/normalized/rules.jsonl`, o
`emag-validation-templates.json` e, no `corpus/`, `fundamentos-visuais/cores.md` e `tipografia.md` para
paleta e escala). **Não abertos:** nada mais de `tela-a2/` (o `servir.mjs` foi só executado), nenhum
`ground-truth-*`, `govbr-corpus/src/acompanhamento/`, os fontes da página, histórico git, planos. Nenhuma
ferramenta do `govbr-ds-validator` e nenhum axe. A página foi medida **como servida**: DOM depois da
inicialização, árvore AX (CDP), estilos computados, e os bytes da resposta HTTP do HTML; os arquivos
`core.min.js`, `comportamento.js` e o CSS servidos **não foram lidos** — o efeito dos scripts foi isolado
por ablação (§ 4).

## 2. Método

Como a tela D: Playwright headless (Chromium do `govbr-eval`), 1280×900, um navegador; cada medida em
**carga nova** + setup declarado; toda medida terminou em ≤ 13 s da carga (limite do protocolo: 120 s);
navegação de quadro e documentos novos registrados por sonda (só houve mudanças de fragmento `#…` dos
links internos; nenhuma recarga dentro de sonda). Universo normativo: as **900** regras `required`/`prohibited`
da base literal cujo `component` está entre os 22 componentes da lista neutra ou é global (inclui as do
e-MAG 3.1 que a base traz), sem filtro por `automatable`/`validationStrategy`; e a camada WCAG 2.1
citada por número para o que a base não diz literalmente. Medidas: presença/visibilidade/caixa de cada
instância, papel/nome/estado AX (CDP `DOM.getDocument` pierce + `Accessibility.getPartialAXTree`), estilos
computados da raiz e descendentes, contraste WCAG de todo texto visível (fundo efetivo por composição
alfa; placeholder por `::placeholder`), ordem de Tab real a partir do início do `<body>` com
**diferença de pixels** foco × sem foco por parada (canvas), e sondas de teclado/ponteiro/200 %.

## 3. Estados

| Estado | Passos | Path | Foco na chegada | Instâncias presentes / visíveis (lista neutra) | Paradas de Tab |
|---|---|---|---|---|---|
| S0 | carga | `/acompanhamento.html` | body | 42 / 18 (42 / 22) | 17 |
| S1 | clique `#aba-documentos` + espera | idem | `#aba-documentos` | 42 / 24 (42 / 28) | 22 |
| S2 | + clique `.acao-enviar` + espera `#msg-retorno` | idem | Fechar de `#msg-retorno` | 45 / 27 (45 / 31) | 23 |

0 pedidos externos, 0 escritas (só GET), 0 erros de página. **Diferença com a lista neutra (4 por
estado):** os 2 itens e as 2 tags do skiplink ficam em y = −900 (fora do documento) até receberem foco; a
lista os marca "visivel", esta medida "presente-nao-visivel" em repouso. Com foco eles aparecem em (16, 0)
(sonda `skiplink-tab`). Os ids da lista do select (`list-NNNN`) mudam a cada carga.

**Observação de 360 s** (contexto próprio, carga limpa, sem interagir): `<meta http-equiv="refresh"
content="300">`; **o documento foi recarregado aos 300,1 s** (beforeunload 300 123 ms → documento novo
300 132 ms → load 300 174 ms); 2 documentos na janela, 1 recarga, 0 erros, nenhum aviso de atualização
nas 36 amostras de texto. Complemento (fora do protocolo, declarado): em S1 com uma opção escolhida e o
switch de e-mail ligado, a recarga dos 300,2 s devolveu aba Andamento, select vazio, switch desligado.

## 4. Proveniência (ablação)

HTML sem JS = HTML + só `core.min.js` (212 elementos, nenhum atributo diferente): o core do DS sozinho não
altera o DOM; os componentes são instanciados pelo script da página. Logo, o que muda com a página inteira
(222 elementos; 31 elementos com atributos novos — `role=combobox` do select, a lista do select refeita,
o botão do upload com `aria-hidden`, setas de tooltip, `aria-current` do passo) é "script" — **core do DS
instanciado ou script autoral, inseparáveis** sem ler fontes. Cada achado traz `origem`
(marcação servida / script / CSS computado do bundle único).

## 5. Contagens

Linhas da tabela (908, uma regra pode ter decisão por estado): **violada 44 · conforme 421 · não se
aplica 273 · incerto 170** (medido-ambíguo 38 · sem observável 44 · não medida 88).
**38 regras da base violadas** (DS 16 · e-MAG 22, contando também as de `tambemViola`), em **34 achados** (unidade = regra principal × elemento;
as outras regras do mesmo fato ficam em `tambemViola`). Achados por fonte principal: **DS 15 · e-MAG 12 ·
WCAG 7** (critérios WCAG envolvidos: 1.3.1, 1.4.10, 1.4.13, 2.2.1, 2.5.3, 3.1.2, 3.2.5, 3.3.1, 4.1.2).
Por estado (achado conta em cada estado em que o elemento existe com o defeito): **S0 23 · S1 29 · S2 29**,
mais 1 dos bytes HTML. Por componente: button 7 · tooltip 5 · página 5 · breadcrumb 4 · switch 3 ·
skiplink 2 · select 2 · upload 2 · message 1 · accordion 1 · step 1 · grupo checkbox/switch 1.
Conformes: 421 linhas da base + 12 pontos WCAG (`conformes.json`, 433).

## 6. Achados (violadas)

| Id | Estado | Componente | Seletor | Regra (fonte) | Medida |
|---|---|---|---|---|---|
| A2-01 | observação 360 s | página | `meta[http-equiv=refresh]` | accessibility-global-6021746e010c (e-MAG 2.4, proibida) + 2.3 | refresh 300 → recarga aos 300,1 s |
| A2-02 | S1 (330 s) | página | idem | accessibility-global-7bb1e5ca34ff (e-MAG 2.5) + WCAG 2.2.1 | limite não anunciado/ajustável; recarga apaga aba, select, switch |
| A2-03 | todos | message | `#msg-pendencia` `<font>`, `align` | accessibility-global-19cbc02f51c6 (guia HTML) + e-MAG 1.1 | marcação apresentacional obsoleta |
| A2-04 | HTML | página | 2 img + 8 input | development-global-a4f97ebb50c5 (proibida) | 10 vazios fechados com `/>` |
| A2-05 | todos | página | `html` | accessibility-global-748eb01e1800 (e-MAG 2.2) | 0 `<noscript>` |
| A2-06 | todos | skiplink | `.atalhos-pagina` | accessibility-global-7c91abad32ce (e-MAG 1.2) + WCAG 4.1.2 | `role=menubar`/`menuitem`; setas não movem o foco |
| A2-07 | S0 | skiplink | `.atalhos-pagina > a` | accessibility-skiplink-fc59fbdac2c2 (DS) | invisível para o ponteiro |
| A2-08 | todos | breadcrumb | `[aria-current=page]` | accessibility-global-742fd4c4f54b (e-MAG 1.4) + 6.3 | `<span tabindex=0>` sem função |
| A2-09 | todos | breadcrumb | idem | component-breadcrumb-8c4ff87d861a (DS) | peso 500, exigido semi bold |
| A2-10 | todos | breadcrumb | `nav[aria-label=Breadcrumbs]` | accessibility-global-9751560f0ae6 (e-MAG 3.2) + WCAG 3.1.2 | nome em inglês sem `lang` |
| A2-11 | todos | breadcrumb | Home × "Meus requerimentos" | accessibility-global-a54fe3e9b8d7 (e-MAG 3.5) | mesmo href, descrições diferentes |
| A2-12/14 | todos | button | `#tip-protocolo-gatilho`, `#tip-prazo-gatilho` | WCAG 2.5.3 (A) | rótulo visível "Ajuda sobre o …" fora do nome AX (= texto do tooltip via `aria-labelledby`) |
| A2-13/15 | todos | button | idem | component-button-81f5e26ec0ef (DS) | círculo 40 px, rótulo visível de 149/158 px fora da superfície |
| A2-16 | S0 @640×450 | button | `#tip-protocolo-gatilho > span` | accessibility-global-24ee65d5b46b (e-MAG 4.3) + WCAG 1.4.10 | scrollWidth 648 > 640 |
| A2-17/18 | todos | tooltip | `#tip-protocolo`, tooltip do Fechar de `#msg-pendencia` | component-tooltip-187fe90aeefd (DS) | seta 9,2 / 8,4 px fora do centro do balão |
| A2-19/20/21 | todos | tooltip | 3 gatilhos | WCAG 1.4.13 (AA) | tooltip some quando o ponteiro vai até ele |
| A2-22 | todos | accordion | `#acc-duvidas button.header` | accessibility-global-5817ddd685a6 (guia WAI-ARIA) + e-MAG 2.2 + WCAG 4.1.2 | expande mas `aria-expanded`/AX ficam false |
| A2-23 | S0 | step | `.etapa-decisao` | component-step-518405a28697 (DS) | indicador `::before` com `visibility:hidden` |
| A2-24 | S1 S2 | select | `.br-input[role=combobox]` | WCAG 4.1.2 (A) | combobox de nome "" |
| A2-25 | S1 S2 | upload | `.upload-button` | WCAG 4.1.2 (A) | botão focável e operável com `aria-hidden=true` |
| A2-26 | S1 S2 | upload | `label.upload-label` | accessibility-global-25887e6e360f (e-MAG 6.2) | etiqueta ligada a input `display:none`; controle operável sem etiqueta |
| A2-27/28 | S1 S2 | switch | `#aviso-email`, `#aviso-sms` | accessibility-switch-364149c5aea4 (DS) | ligado, `aria-checked` continua "false" |
| A2-29 | S1 S2 | grupo | `#fs-avisos` | accessibility-global-4d5b05a1c29c (e-MAG 6.7) + DS Formulário + WCAG 1.3.1 | fieldset sem legend |
| A2-30 | S2 | select | `.br-input.danger` | accessibility-global-271582e4fbe8 (e-MAG 6.6) + WCAG 3.3.1 | erro só por borda vermelha, sem texto |
| A2-31 | todos | tipografia | `#titulo-duvidas` | foundation-global-21fb08664799 (DS) | 16 px fora da escala Minor Third |
| A2-32/33 | S1 S2 / todos | button | `.acao-enviar`, `.acao-voltar` | pattern-global-f4a0aa1ba9c3 (DS Microcopy) | iniciais minúsculas em botão |
| A2-34 | S1 S2 | switch | rótulo "…por SMS" | accessibility-global-37aeaff46667 (e-MAG 3.12) | sigla sem forma completa |

Medida completa, esperado, justificativa, evidência e origem por achado em `achados.json`. Os achados de
botões de ajuda, tooltips, breadcrumb e tipografia foram medidos em S0; o elemento é o mesmo, inalterado,
em S1 e S2 (`instancias.json` dos três estados).

## 7. Conformes verificados (amostra; lista inteira em `conformes.json`)

Contraste ≥ 4,5:1 em todo texto visível dos três estados (mínimo 4,59). Foco visível nas 17/22/23 paradas
(diferença de pixels > 0 em todas; contorno tracejado 4 px `#c2850c`); clique não gera foco visual.
Skiplink: primeiro foco, mesma posição para os dois itens, volta a oculto, leva a `#main-content`/`#rodape`.
Abas: Tab + setas, foco inicial na 1ª aba, estados ativo/interativo. Select: abre com ArrowDown, setas,
filtro por texto, "Não encontramos…" no vazio, lista com sombra abaixo do campo. Checkbox pai/filho com
estado intermediário (AX mixed). Switch: Space alterna, efeito imediato com `aria-live` "Preferência
salva.", AX do Chromium com estado correto. Mensagem de erro recebe o foco no Fechar; Fechar opera com
Enter/Space/clique. Tabela com caption, thead, `headers=`. Paleta: todas as cores computadas na paleta do DS;
fonte Rawline em todo texto. h1 único, lang pt-BR, título descritivo, sem `title`, sem `target`.

## 8. Incertos (170; `incertos.json`)

**Medido-ambíguo (38)**, entre eles: foco não vai ao Fechar de `#msg-pendencia` na carga (mover o foco
conflita com o skiplink como 1º foco); posição da mensagem de pendência (depende de classificá-la como
"geral"); Home do breadcrumb e "tela inicial do sistema"; breadcrumb como única navegação (não há menu
principal); colunas da tabela sem divider vertical; tag do skiplink com rótulo numeral; tooltip do Fechar
a 68 px da borda direita posto acima; alvos de 32/40 px × área de toque de 48 px (desktop); etapas
desabilitadas com rótulo em cor plena; `name`+`id` nas âncoras (o `name` é inválido em `main`/`footer`);
1º campo obrigatório não recebe foco (conflita com abas/mensagem); dropzone do upload (arrastar não
simulado); papel `listbox/option` das etapas sem navegação por setas (não há regra literal); foco vai ao
`body` depois de escolher no select (o ponto de partida do Tab é preservado). **Sem observável (44)** e
**não medida (88)**: diretrizes de projeto, redação e consistência entre páginas (estados, grid,
iconografia, navegação, UX writing).

## 9. Limites

Só 1280×900 (mais 640×450 para 200 %); um motor (Chromium) — a AX de outros navegadores pode diferir
(ex.: o switch com `aria-checked` fixo). Sem leitor de tela real. Estados selecionados de checkbox/switch
não fotografados; arrastar arquivo e envio com sucesso não exercitados (exigiriam escolher dados).
Contraste não textual (1.4.11) não medido. A proveniência separa marcação × script, mas não core do DS ×
script autoral, nem CSS do DS × CSS autoral (bundle único). Medidas de layout de designer (espaçamentos em
tokens) não confrontadas com valores: a base literal não traz a tabela de tokens.

## 10. Como refazer

```
cd F:\Dev Nath\TCC\govbr-eval
node tela-a2/servir.mjs            # em outro terminal (porta 3218)
node tela-a2/auditoria/rodar.mjs   # --longas refaz também as observações de 360 s e 330 s (~11 min)
node tela-a2/auditoria/conferir-auditoria.mjs   # 34/34
```
