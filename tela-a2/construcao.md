# Tela A2 — registro da construção (2026-11-02)

Semente `876024a331d8e9cc05837554f11aeda01aa8b2ff` · sorteio em `sorteio-2.json` (revisão formal 2, D-160) ·
tela em `govbr-corpus/acompanhamento.html` (entrada Vite), com `src/acompanhamento/` (folhas: `acompanhamento.css`
→ Font Awesome 6.6.0 do pacote, `rawline.css`, `core.min.css` do `@govbr-ds/core` 3.7.0, `pagina.css`; fontes
Rawline woff2) e `public/acompanhamento/` (`core.min.js` do pacote, byte a byte; `comportamento.js`; as duas marcas
gov.br em SVG) + `public/meus-requerimentos.html` (destino da trilha e do Voltar, plano § 14.5).

Conferência sem modelo, sem oráculo e sem axe: `node tela-a2/conferir-construcao.mjs` —
**79/79** (17 observáveis de defeito — as 16 unidades, com a 2.3 medida duas vezes: a meta e a janela de 360 s, que registrou cargas aos 0,1 s e 300,2 s —; 62 pontos conformes). Chromium headless 1280×900; ~6 min por causa da janela da 2.3 (`--sem-janela-recarga` pula só ela, para iteração, e sai com código 2). Nada aqui foi medido por agente, e nenhuma ferramenta do `govbr-ds-validator` foi chamada
sobre a tela. `hasChecker` continua sem anotar.

## Como servir

- **Montar:** `npm run build` no `govbr-corpus` (a entrada `acompanhamento` está em `vite.config.ts`). Nesta
  construção o `dist/` foi atualizado só nos arquivos da A2 (build dirigido à entrada, sem esvaziar o `dist/` nem
  recopiar `public/`), porque outra ala do corpus estava sendo gerada ao mesmo tempo; o build completo num diretório
  descartável deu os mesmos bytes para `acompanhamento.html`, a folha `assets/acompanhamento-*.css`,
  `acompanhamento/*` e `meus-requerimentos.html`.
- **Servir o `dist/`:** `node tela-a2/servir.mjs [porta=3218]` (estático, sem fallback de SPA) →
  `http://127.0.0.1:3218/acompanhamento.html`. Quando a referência existir e a tela entrar em `telas.json`:
  `APP_URL=http://127.0.0.1:3218 npm run conferir:referencia -- --tela acompanhamento`.
- **Superfície de medida:** a entrada é página comum (não SPA). O fechamento de arquivos de
  `scripts/measurement-surface.ts` dá 39 arquivos: a página, a folha, as fontes, `core.min.js`, `comportamento.js`,
  as marcas, `meus-requerimentos.html` e — como na tela A — os `collapse.js`/`dropdown.js` das alas `pnip*`, cujos
  nomes aparecem no texto do `core.js`.

## Como a tela foi montada

Marcação dos exemplos oficiais do pacote `@govbr-ds/core` 3.7.0 (`dist/components/*/examples`); o comportamento de
tab, step, select, checkbox (grupo com os switches), accordion, upload, tooltip, message e breadcrumb vem das
classes do `core.js` do próprio pacote, instanciadas uma vez em `comportamento.js`. Escritos à mão: envio do
formulário e retorno, aviso "Preferência salva.", Esc nos balões, destino do foco ao fechar uma mensagem e o teclado
do Fechar em `div`.

**Página estática com scripts clássicos, não TSX.** A tela A é React; a A2 não pode ser: `a2-a3ed861cbd65`
(elegível, não sorteada) proíbe `type` em `script`, e toda entrada de módulo do Vite sai com `type="module"`.
Por isso o HTML é escrito à mão, a folha é empacotada pelo Vite (sai como `link rel=stylesheet` sem `type`) e os
dois scripts são arquivos de `public/` servidos como estão. Sem `style`/`script` embutido (`a2-6afb3201269f`).

**Estados** (cada um medido de carga nova, em até 120 s, plano § 14.5):

| Estado | Passos declarados |
|---|---|
| S0 | carregar `/acompanhamento.html` |
| S1 | S0 + clicar a aba Documentos (`#aba-documentos`) |
| S2 | S1 + clicar Enviar documento (`.acao-enviar`) com o formulário vazio |

## Unidades sorteadas (14 specs, 16 unidades)

| Spec | Hospedeiro (onde está) | O que a construção decidiu | O que medir |
|---|---|---|---|
| `a2-10aee59f9c1b` rotulo-aba-pequeno (DS) | `tab-requerimento`: `#tab-requerimento .tab-item button` (as duas abas) | O core dá `--font-size-scale-up-02` (20,16 px); a folha da tela põe `--font-size-scale-base`, que no 3.7.0 vale **14 px** (não 16). Peso medium mantido. | S0: `font-size` computado dos dois botões = valor de `--font-size-scale-base` (14 px) ≠ `--font-size-scale-up-02`. |
| `a2-caf6bc80cb4b` borda-sem-feedback (DS) | `upl-documento`: `#upl-documento .upload-button` | **O defeito coincide com o core 3.7.0:** o `BRUpload` só põe a classe `dragging`, e o CSS do pacote só muda o fundo; nenhuma regra deixa a borda verde. A página acrescenta o estado Dropzone ativo conforme (fundo de interação com `--surface-opacity-sm`, cursor `copy`, `a2-33f8d78aa04b`) sem mexer na cor da borda. | S1: `dragenter`+`dragover` sintéticos com `DataTransfer` de um PDF no botão da área: classe `dragging` presente e `border-top-color` igual à de repouso (`rgb(19, 81, 180)`), não `--success` (`#168821`). |
| `a2-329f74d7646c` titulo-fora-da-tabela (DS) | `pagina`: `h2.titulo-duvidas` ("Dúvidas Frequentes") | A variante não fixava **qual** h2 (os efeitos declaram `titulo-form` e `titulo-duvidas`). Escolhido o das dúvidas: no título do formulário, 16 px o deixaria menor que os textos do próprio formulário e que o rótulo do grupo, violando também `a2-3d935c4b833a` e `a2-2e4efd30789f` (segunda violação não declarada como norma concorrente). Valor literal da variante: `font-size: 16px; font-weight: 700`. | S0: `h2.titulo-duvidas` com 16px/700. Comparação (S1): `h2.titulo-formulario` com `--font-size-scale-up-05` (34,832 px) e 400. |
| `a2-52ea5c58a080` sem-indicador (DS) | `stp-andamento`: 3ª etapa, `.etapa-decisao` | O indicador é o `::before` do `.step-progress-btn` (número do `BRStep`); fica `visibility: hidden`. Rótulo e linha do tempo mantidos (a linha passa sem o ponto, como declarado nos efeitos). | S0: `::before` da 3ª etapa com `visibility: hidden`; etapas 1, 2 e 4 visíveis, 40×40, com número. |
| `a2-5f85eeafe863` icone-descentralizado (DS) | `msg-pendencia`: Fechar (`.aviso-pendencia .fechar-mensagem`) | `justify-content`/`align-items: flex-start` no botão: o ícone vai ao canto superior esquerdo (desvio de 4 px na horizontal e 8 px na vertical num botão 32×32). | S0: maior desvio entre o centro do `<i>` e o centro do botão > 3 px (medido 8 px). Comparação: gatilhos das tooltips (S0), gatilho do select (S1) e Fechar de `msg-retorno` (S2) com desvio ≤ 1 px (medido 0). |
| `a2-e99c92f13ac0` texto-alternativo-visivel (DS) | `tip-protocolo` + compartilhada `tip-prazo`: `span.rotulo-botao` dos gatilhos | Todo botão só de ícone tem o texto alternativo num `span.rotulo-botao`; nos conformes ele leva `sr-only`. Nos dois gatilhos o `span` vem sem `sr-only`. Como o `.br-button` tem `overflow: hidden` e 40 px, o texto ficaria cortado dentro do círculo; para que "apareça escrito ao lado do ícone" sem mudar o botão (40×40, ícone centrado), o `span` é posicionado à direita do botão (`.rotulo-botao`, absoluto) e o gatilho tem `overflow: visible` (`.ajuda-resumo`). **O core 3.7.0 não define `.sr-only`**; a classe está na folha da tela. O nome acessível dos gatilhos continua vindo do `aria-labelledby` (balão). | S0: o `span` de cada gatilho tem largura > 20 px, `clip: auto`, e `elementFromPoint` no centro dele devolve o próprio `span` ("Ajuda sobre o NUP", "Ajuda sobre o prazo"). Comparação: `span` do Fechar de `msg-pendencia` (S0) e de `msg-retorno` (S2) com 1×1 px e `clip: rect(0px, 0px, 0px, 0px)`. |
| `a2-e9ded28efe9c` aria-checked-fixo (DS) | `swt-aviso-email` + compartilhada `swt-aviso-sms`: `#aviso-email`, `#aviso-sms` | **O defeito coincide com o core 3.7.0:** o pacote não mantém `aria-checked` (conferência de construtibilidade); a marcação traz `aria-checked="false"` e nada o atualiza. Na página conforme isso pediria script próprio, que aqui não existe. | S1: clicar o rótulo de cada switch → `checked` verdadeiro e `aria-checked` = `"false"`. |
| `a2-971db6a57c75` item-expandido-sem-estado (G) | `acc-duvidas`: `#acc-duvidas .header` | **O defeito coincide com o core 3.7.0:** o `BRAccordion` só alterna `[active]` e o ícone; os cabeçalhos trazem `aria-expanded="false"` na marcação e nada o atualiza. | S0: clicar o 1º cabeçalho → item `[active]`, painel visível, `aria-expanded` = `"false"`. Comparação (S1): `aria-selected` das abas acompanha a troca (`BRTab`). |
| `a2-d720ea8520cb` erro-so-borda (G) | `sel-tipo-documento`: `#tipo-documento` | Em S2 a caixa `.br-input` do select ganha `danger` (borda `--danger`) e mais nada: sem `.feedback`, sem `aria-describedby`, sem `aria-invalid`. Para a infração não ser desfeita pela mensagem de retorno, `msg-retorno` diz que há campos com problema e o que fazer, **sem nomear os campos** (o e-MAG 6.6 aceita um aviso que identifique os campos; nomear o select no aviso cumpriria a cláusula). | S2: `border-top-color` do campo = cor de `--danger` (`rgb(229, 34, 7)`), nenhum texto de erro no select nem ligado a ele, e o texto de `msg-retorno` não contém "Tipo de documento". Comparação: o upload inválido tem `.feedback` com texto, sem botão, ligado ao input por `aria-describedby`. |
| `a2-22240b8959ba` recarga-periodica (G) | `pagina`: `head` | `<meta http-equiv="refresh" content="300">`, sem url, sem aviso. Protocolo de tempo do plano § 14.5. | S0: uma única meta refresh com `300`. Contexto próprio, carga limpa, janela de 360 s: ≥ 2 eventos `load` do documento. |
| `a2-d45711a55b6c` fechar-div (G) | `msg-retorno`: Fechar | `div.br-button.circle.small` com `role="button"`, `tabindex="0"`, `aria-label`; Enter/Espaço disparam o clique (o `BRAlert` escuta clique no `.close`). Mesmas classes e mesmo balão "Fechar" do conforme. | S2: `tagName` DIV, `role=button`, `tabIndex` 0; Enter fecha e o foco volta ao Enviar. Comparação: o Fechar de `msg-pendencia` é BUTTON. |
| `a2-cd5cbf0f18dc` sem-formato (G) | `upl-documento`: `#arquivo-apoio` | O texto de apoio da forma conforme tem duas frases (arrastar; formatos e tamanho). Sai só a dos formatos e tamanho; fica "Você também pode arrastar o arquivo até a área acima.", porque tirar o texto inteiro violaria também `a2-2e8e53cf16ef` (arrastar informado abaixo do campo). A restrição continua valendo no envio (sem `accept`, conferida no submit). | S1: o texto ligado ao input por `aria-describedby` não cita PDF/JPG/PNG/MB/formato/tamanho e cita arrastar. Envio com `comprovante.txt` → recusa com "O arquivo deve estar em PDF, JPG ou PNG e ter até 5 MB." |
| `a2-671056d628cb` apresentacao-no-html (G) | `msg-pendencia`: `.content` | `<div class="content" align="left">` e o texto dentro de `<font color="#333333">` — os mesmos valores que o CSS já dá (cor de leitura `--gray-80`, alinhamento à esquerda), para não criar uma segunda infração visual. | S0: `font[color]` e `[align]` dentro de `msg-pendencia`. Comparação: nenhum em `crd-resumo` (S0) nem em `msg-retorno` (S2). |
| `a2-18bccce4132a` grupo-sem-legend (G) | `chk-avisos-todos` (grupo `fs-avisos`): `fieldset.grupo-avisos` | O fieldset existe (com o checkbox principal e os dois switches), sem `legend`; "Avisos sobre o requerimento" é um `p.titulo-avisos` logo antes, sem ligação programática, com o mesmo estilo que a legend teria. | S1: `fieldset` sem `legend`, irmão anterior `P` com o texto, os três controles dentro. |

Os dois defeitos de `msg-pendencia` (`5f85` no Fechar, `671056` no texto) e os dois de `upl-documento` (`caf6` na
área, `cd5c` no texto de apoio) são observáveis independentes, como no `msg-retorno` da tela A.

## Alternativas válidas (3) — construídas conformes, alegar defeito nelas é falso positivo

| Regra / alternativa | Onde | Decisão | O que medir |
|---|---|---|---|
| `a2-959ca4537add` associacao-por-headers | `tbl-movimentacoes` | `th` com `id` no `thead`, `td` com `headers` apontando para eles, sem `scope`; `caption` como 1º filho e `tbody` mantidos. O core 3.7.0 deixa o `caption` com `opacity: 0`; o título visível é o `table-header .table-title` do exemplo oficial. | S0: `caption` 1º filho, 3 `th` no `thead`, 15 `td` com `headers` que resolvem, nenhum `scope`. |
| `a2-e5b4728ca51e` prefixo-textual-visivel | `msg-retorno` | Título começa com "Erro:" visível; ícone `fa-times-circle` do DS mantido (`aria-hidden`, sem texto oculto). A forma canônica fica em `msg-pendencia`: ícone com `span.sr-only` "Alerta" e título sem palavra de tipo. | S2: texto começa com "Erro:", ícone times-circle. Comparação: `msg-pendencia` com tipo oculto "Alerta" e sem palavra de tipo visível. |
| `a2-61f57f2a7ff5` balao-abaixo | `tip-protocolo` | `place="bottom"`; a canônica (`tip-prazo`) é `place="top"`. | S0, foco no gatilho: balão visível com `data-popper-placement="bottom"`, topo do balão abaixo do gatilho a ≤ 16 px (medido 8,3 px), seta acima do balão com o centro dentro da largura do gatilho. Comparação: `tip-prazo` acima, a ≤ 16 px, seta abaixo apontando para o gatilho. |

## Chamarizes (8) e moldura

| Instância | O que medir (S0, salvo indicação) |
|---|---|
| `hdr-govbr` | `.br-header` visível, no topo (y = 0), antes do `main`. |
| `ftr-govbr` | `.br-footer` visível, depois do `main`. |
| `skp-conteudo` | `.br-skiplink` 1º filho do `body`; âncoras existem; o 1º Tab cai no atalho, visível, para `#main-content`. |
| `brd-trilha` | `.br-breadcrumb` 1º conteúdo do `main` (Área de Localização), último item com `aria-current="page"`. |
| `div-secoes` | `.br-divider` entre as abas e a seção de dúvidas, borda sólida 1 px `--gray-20` (`#ccc`), fora do foco. |
| `crd-resumo` | `.br-card`, superfície `#fff` com sombra, NUP por extenso na 1ª ocorrência, caminho para detalhes, sem `font`/`align`. |
| `btn-voltar` | `a.br-button.secondary` para `meus-requerimentos.html` (que existe no `dist/`). |
| `btn-enviar` | (S1) `button.br-button.primary` `type=submit`, 40 px, "Enviar documento". |
| moldura `main` | exatamente um `main`, visível. |

Além disso, conferidos como pontos conformes: DOCTYPE/lang/UTF-8/X-UA-Compatible/título; hierarquia h1→h2; HTML
servido sem `style`/`script` embutido, sem `type` em `script`/`link`; `core.min.js` idêntico ao do pacote 3.7.0;
Rawline como fonte usada (CDP); `BRStep` instanciado; balões ocultos na carga, um por vez, Esc fecha; accordion
`single` sem valor; checkbox principal intermediário/marcado; "Preferência salva." ao alternar; nenhum pedido fora
da origem; nenhum erro de console ou resposta 4xx/5xx; cada estado medido em até 120 s sem recarga no meio.

## Decisões de construção fora do sorteio

- **`.sr-only` na folha da tela**: o `core.min.css` 3.7.0 não define a classe que os exemplos oficiais usam.
- **Balão do gatilho do select**: o `BRSelect` remonta o campo e põe o botão no fim do `.br-input`; o `BRTooltip`
  pega o ativador por `previousSibling.previousSibling`, então `comportamento.js` devolve o balão para logo depois do
  botão antes de instanciar as tooltips. O gatilho do select fica sem `tabindex="-1"` (decisão da conferência de
  construtibilidade). Todo botão só de ícone (Fechar ×2, gatilho do select) mostra o rótulo em balão.
- **Marcas gov.br em SVG próprio** (`marca-govbr.svg`, `marca-govbr-negativa.svg`): a imagem embutida no exemplo do
  header é um marcador genérico e o footer oficial aponta para CDN.
- **Foco ao fechar mensagem**: `msg-retorno` → Enviar documento (de onde veio); `msg-pendencia` → título da página
  (`h1` com `tabindex="-1"`, o ponto do fluxo imediatamente antes dela). Ao exibir `msg-retorno`, o foco vai ao Fechar.
- **Envio válido** mostra uma mensagem de sucesso no mesmo lugar (estado fora da referência, como na tela A).
- **Switches** cada um num `div.item-aviso` (o `.br-switch` é `inline-flex` e ficaria lado a lado).
- **Select** limitado a 400 px; upload na largura máxima do core (550 px).
- **Step**: ícone do marcador de concluído em `--icon-size-base` e texto oculto ", etapa concluída" (decisões da
  conferência de construtibilidade); `disabled` e `single` como atributos booleanos sem valor (`a2-11b459a3885c`).
- **Textos** fictícios; títulos em maiúscula inicial por palavra (`a2-598ca56880b1`); NUP por extenso na 1ª
  ocorrência (`a2-b1113ccfbc0a`); nenhum rótulo termina com dois-pontos.

## Descartes

Nenhum. Todas as 14 specs, as 2 cópias compartilhadas, as 3 alternativas e os 8 chamarizes foram construídos como
o sorteio diz.

## Condições de fundo que ninguém injetou

Vêm da marcação oficial ou do `core.js` 3.7.0, existem nos dois braços e não são unidades da referência (entram
como descoberta na adjudicação, D-48): o botão do upload criado pelo `BRUpload` é focável com `aria-hidden="true"`;
o skiplink canônico usa `role="menubar"`; o `BRTooltip` calcula a posição do balão na criação e não a refaz ao abrir (se a página
mudar de layout antes, o balão pode abrir deslocado do gatilho); clicar a etapa concluída
do step faz o `BRStep` marcá-la como ativa; o `BRSelect` acrescenta um ícone de busca no campo; o core deixa o
`caption` com `opacity: 0`. A meta refresh recarrega a página a cada 300 s também durante a bateria (efeito real
do defeito, plano § 14.5 item 4).

## Limites

A conferência mede o fato declarado de cada unidade e os pontos de comparação; não prova que a página cumpre as
437 elegíveis (isso é da auditoria cega por medição, plano § 9.3). O assistente escreveu as manifestações e
construiu a tela, então conhece a referência (D-48).
