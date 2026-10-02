# Tela B (Vistorias) — auditoria por medição

**Método:** `tela-b/metodo-auditoria.md`, congelado no commit **`5838702`** do `govbr-eval`, com o
**adendo** `tela-b/metodo-auditoria-adendo-vistorias.md`, congelado no commit **`9406aed`** (o adendo
prevalece onde os dois diferem). HEAD do `govbr-eval` na execução: `9406aed`; `govbr-corpus`: `5a3c3f8`.
**Executada em:** 2026-09-30, por assistente LLM (Claude), sem o oráculo, sob o D-48 (§ 7 do método).
**Status:** referência **candidata** (`ground-truth-vistorias.json` `1.0.0-candidata`) — faltam as
decisões da autora sobre a lista escalada (§ 8), a re-medida do segundo agente (§ 12) e a ratificação
no log. Nada congelado, nada commitado. `telas.json › vistorias.reference` voltou a `null`.

Arquivos (todos em `govbr-eval/`):

| Arquivo | O que é |
|---|---|
| `tela-b/vistorias/comum.mjs` | condições de medida (manifesto, servidor com as regras da superfície, 1280×900, fuso, aborto de toda saída, registro de escritas, `executarPassos`) |
| `tela-b/vistorias/teste-estados.mjs` → `estados.json` | teste de estados (§ 3) |
| `tela-b/vistorias/selecionar-estados.mjs` → `selecao.json` | escolha gulosa por cobertura (§ 3) |
| `tela-b/vistorias/sequencia.mjs` | a sequência escolhida (= `_meta.setup`/`_meta.states`) |
| `tela-b/vistorias/inventario.mjs` → `inventario.json` | inventário por estado (§ 4) |
| `tela-b/vistorias/montar-decisoes.mjs` → `decisoes.json` | tabela regra × veredito completa (186 linhas) |
| `tela-b/vistorias/conferir-auditoria.mjs` | conferência sem modelo (§ 11) |
| `tela-b/vistorias/servir.mjs` | serve o `dist/` em porta fixa para `conferir:referencia` |
| `ground-truth-vistorias.json` | referência candidata |

## 0. A tela nunca foi medida por agente — conferido pelos nomes

Só nomes de arquivo, `vistorias|pnip`: `git -C govbr-eval log --all --name-only` → só
`ground-truth-pnip-login.json` (`a493164`, auditoria do recuo), `tela-b/vistorias-integracao/*`
(`e4d644b`, percurso de integração sem modelo) e o adendo (`9406aed`). `results/` e `pipeline/` até a
3ª profundidade: nenhum nome com `vistori`/`pnip`. `govbr-ds-validator` (todo o histórico): nenhum.
`govbr-corpus`: só `5a3c3f8` (a ala `pnip/`). Nada fora do esperado pelo adendo; nada escalado.

## 1. Objeto e condições de medida

Árvore `govbr-corpus/public/pnip/` (cópia idêntica em `dist/pnip/`): **190/190** arquivos do
manifesto com sha256 conferido nas duas raízes, **nenhum arquivo fora** do manifesto.
**sha256 de `pnip/manifesto.json`: `eb2d439d128c6ca3bd5bd3a66f33de4dd22e4f15efcf05447c0a0df7a4c44d98`**
(igual em `public/` e `dist/`). O manifesto declara core 3.4.1, webcomponents 1.16.0, hoje congelado
2026-03-16T09:30.

Servidor próprio (porta efêmera de 127.0.0.1) com as regras de `telas.json › vistorias.isolamento.site`:
só a árvore `pnip/` menos o manifesto, `pnip/index.html` para GET sem extensão sob `/pnip/`, o alias do
`exit-icon.png`. Chromium do Playwright do `govbr-eval`, headless, 1280×900, fuso `America/Sao_Paulo`,
Node 25.2.1. Toda requisição fora da origem é abortada e contada: **0** em todas as medidas. Escrita no
mock: o backend é um interceptor dentro da página (não passa pela rede), então a escrita é lida no
registro do próprio mock (`window.__pnipMock.atendidos()`, chaves `MÉTODO caminho`) **e** no log de rede;
**0** escritas em todas as paradas. Cada medida parte de carga nova.

**Versões (§ 1).** Cores computadas confrontadas com `tokens/colors.json` 3.7.0: todas são tokens,
exceto `#bbb` (B-15, CSS autoral). Único valor que difere entre a versão da página e a da norma: o
espaçamento de 24 px entre colunas do grid do core 3.4.1 contra 40 px da KB → escalada **E-08**
(§ 1.4). Nenhuma regra caiu em `não-aplicável (versão)`.

## 2. Exposição prévia do auditor (marca `exposto`)

Lidos antes de julgar: o README-MOCK § 8 inteiro (inclui § 8.4 e § 8.6), `tela-b/vistorias-integracao/percurso.mjs`
(o código; **as capturas PNG não foram abertas**), a auditoria de `/privacidade` (`tela-b/auditoria.md`:
E-05 `has-menu` sem menu; E-06 a subárvore do menu do avatar — `img` sem `alt`, `role="menu"` sem
`menuitem`, `button` com `href`, `<p>` dentro de `<button>`), o índice de memória do assistente (D-53:
"page constraints header/footer/skip-link") e o casco do D-54..D-56 (skip link, ordem de títulos,
rodapé). Para navegar na exploração, lidos também os uuid/status de
`pnip-mock/src/mock/fixtures/vistorias/semente.json` (conteúdo de fixture, fora da medida).

## 3. Estados (método § 2, adendo § B)

### 3.1 Teste de estados — `node tela-b/vistorias/teste-estados.mjs --json tela-b/vistorias/estados.json`

Hidratação: `main tbody tr` (vira `_meta.waitFor`) + `customElements.whenDefined` de cada `br-*`
presente. Gatilhos enumerados mecanicamente no light DOM e em toda shadow root aberta (seletor do
método + `.br-tag` + controles da barra de filtros e da busca); cada gatilho × gesto (clique real,
Enter com foco) em **3 cargas novas**; foto antes/depois = DOM serializado com shadow roots (hash),
árvore do Chromium (CDP), URL, marca do documento, escritas no mock, pedidos externos, tipos visíveis.

- **Fase 1 — rotas da lista:** o detalhe de cada uma das 34 linhas da aba padrão (Tramitando, 4
  páginas de 10), uma carga por linha: 0 escritas; três conjuntos de ações distintos — l.1 (agendada:
  Editar, Voltar), **l.17** (p.2 l.7, não comparecimento: + Avançar), **l.18** (p.2 l.8, preenchida:
  + Trocar embarcação da vistoria, Mostrar).
- **Fase 2 — bases:** `lista` (entrada); `detalhe@1` (olho da 1ª linha); `detalhe@17` e `detalhe@18`
  (1ª linha da aba padrão que oferece cada ação que a 1ª não oferece — adendo § B, regra 2); e as
  rotas da mesma árvore alcançadas por clique a partir delas: `editar-dados-vistoria@detalhe@{1,17,18}`.
- **Fase 3 — resultado:** 7 bases, 141 gatilhos, **282 gatilho×gesto**: sem-efeito 81 · produz-estado
  101 · navega 40 · recarga 40 · não aditivo 14 · escrita 6. Com efeito (1ª linha representa as
  demais linhas iguais da tabela):

| Base | Gatilho (clique) | Veredito | Enter | Obs. |
|---|---|---|---|---|
| lista | avatar (`#avatar-dropdown-trigger`) | produz-estado 3/3 | igual | +14 visíveis (br-list, br-item) |
| lista | "Exportar Vistorias"; ações da linha atribuir/excluir/notificar | produz-estado 3/3 | igual | diálogos SweetAlert2 (árvore 704 → 20–53 nós) |
| lista | etiquetas Cidade/Porto/Vistoriador/Status | produz-estado 3/3 | **sem efeito 0/3** | painel com br-radio/br-list |
| lista | "Exibir lista" (×2) | produz-estado 3/3 | igual | lista do select |
| lista | abas Agendar/Concluídos; páginas 2–4, "Página seguinte" | não aditivo | igual | item 2 do adendo |
| lista | olho de cada linha | navega → detalhe | igual | |
| lista | "Voltar" → `/pnip/portal-mpa`; Home do breadcrumb | navega fora / recarga | igual | |
| detalhe@* | "Editar" | navega → editar-dados | igual | |
| detalhe@*, editar@* | "Vistorias"/Home do breadcrumb | **recarga** (`/portal-mpa…`, sem `/pnip/`) | igual | artefato da hospedagem |
| detalhe@17 | "Avançar" | **escrita** (`POST …/editar/preenchimento/…`) | igual | |
| detalhe@18 | "Trocar embarcação da vistoria" | produz-estado 3/3 | igual | br-modal + scrim |
| detalhe@18 | "Mostrar" (×2) | produz-estado 3/3 | igual | seções recolhidas |
| detalhe@18 | "Avançar" | produz-estado 3/3 | igual | SweetAlert2 + campos da conclusão |
| detalhe@18 | "Editar" da seção Vistoria | não aditivo | igual | edição no lugar |
| editar@1 | "Salvar" | produz-estado 3/3 | igual | validação (SweetAlert2) |
| editar@17, editar@18 | "Salvar" | **escrita** (`POST …/editar/dados-vistoria/…`) | igual | |

### 3.2 Escolha gulosa — `node tela-b/vistorias/selecionar-estados.mjs --json tela-b/vistorias/selecao.json`

**A escolha rodou sobre `estados.json` e só sobre ele, por cobertura de tipos, antes do inventário e de
qualquer decisão de defeito** (o script não lê medida de defeito nenhuma). Tipos = componentes do DS
(tag/classe `br-*` mapeada aos 36 nomes de `components/`) e estruturas (regiões, títulos, tabela,
formulário, campo, caixa de seleção, botão de opção, link, imagem, lista, `dialogo` = role
dialog/alertdialog **ou sobreposto modal**, mensagem). Traço:

```
rodada 0: inicial (obrigatória) — cobre DS [avatar breadcrumb button divider header input pagination select signin tab table tag]
          · estruturas [caixa-de-selecao campo imagem link lista regiao:banner regiao:main regiao:navigation tabela titulo:h2]
rodada 1: escolhida detalhe@17 + clique "Avatar com dropdown" [comum] — melhores candidatas:
    detalhe@17 + clique "Avatar com dropdown" [comum] +DS 3 (item,list,textarea) +estr 3 (formulario,titulo:h3,titulo:h4) · 3 passos
    detalhe@17 + clique "U" [comum] +DS 3 (item,list,textarea) +estr 3 · 3 passos
    detalhe@1 + clique "Avatar com dropdown" [comum] +DS 2 (item,list) +estr 3 · 3 passos
    detalhe@18 + clique "Avatar com dropdown" [comum] +DS 2 (item,list) +estr 3 · 3 passos
rodada 2: escolhida detalhe@18 + clique "Trocar embarcação da vistoria" [diálogo (com a rota nua como parada comum)]
    +DS 2 (modal,scrim) +estr 1 (dialogo) · 3 passos
rodada 3: nenhuma vista elegível acrescenta tipo — fim
```

**Paradas (4 de no máximo 6), em 3 segmentos:**

| Estado | Segmento / rota | O que acrescenta | Passos no segmento |
|---|---|---|---|
| `inicial` | 0 · `/pnip/portal-mpa/vistorias` | lista: header, breadcrumb, abas, filtros (tag), busca, datas, tabela com caixas e ações, paginação, select | 0 |
| `detalhe-menu` | 1 · `…/agendar-vistoria/…3046` | detalhe de não comparecimento (formulário, h3/h4, textarea) + menu do avatar aberto (br-list, br-item) | 3 (+1 de trânsito: fecha o menu) |
| `detalhe` | 2 · `…/agendar-vistoria/…3038` | detalhe preenchido, rota nua (parada comum antes do diálogo) | 1 |
| `modal` | 2 · idem | br-modal "Trocar embarcação" + scrim | 3 |

Tipos vistos em alguma vista e **não** cobertos: br-radio, botão de opção (painéis de filtro e listas
do select, na lista — regra 5) e "mensagem" (validações em SweetAlert2 — regra 5, sem componente do DS).

### 3.3 Fora da escolha (com o motivo; também em `_meta.fora_de_escopo` e `selecao.json`)

- **Antes da conta** (73 no total, contando repetições por base): recarga do documento (20: links do
  breadcrumb, que apontam para `/portal-mpa…` sem o prefixo `/pnip/`); não aditivo (7: abas, paginação,
  "Editar" no lugar — item 2); navegação para rota já tratada como base (7) ou para fora da árvore
  `vistorias/` (4: "Voltar"); escrita no mock (3: "Avançar" do não comparecimento, "Salvar" da edição).
- **Regra 5, segmento da lista já tem sua parada (`inicial`, afterStep 0):** menu do avatar, 4 painéis
  de filtro, 2 listas "Exibir lista" (8).
- **Regra 5, diálogo sem componente do DS novo:** SweetAlert2 de Exportar, Atribuir, Excluir,
  Notificar, e a validação do "Salvar" da edição (5).
- **Regra 5, segmento já tem parada comum / de diálogo:** "Mostrar" ×2 e avatar no detalhe@18 (6);
  "Avançar" do detalhe@18 (1, segundo diálogo do segmento).
- **Regra 3, nenhum tipo novo:** detalhe@1 (rota e avatar), as três rotas de edição de dados (12).

## 4. Inventário (§ 3.1) — `node tela-b/vistorias/inventario.mjs`

Completo em `inventario.json`, por estado (todo elemento com tag, classes, caixa, visibilidade,
focabilidade, papel e nome da árvore do Chromium; cabeçalhos, tabelas, campos e rótulos, botões,
imagens, links, diálogos, cores, tipografia, contraste, truncamento, ordem de Tab real).

| Estado | Elementos (visíveis) | Títulos | Marcos | Tab | Contraste < 4,5 |
|---|---|---|---|---|---|
| inicial | 772 (502) | h2 | banner, main, 3 navigation | 80 pontos | 12 |
| detalhe-menu | 285 (213) | h3, 6×h4 | banner, main, form | 12 | 1 |
| detalhe | 584 (254) | h3, 9×h4 | banner, main, form | 14 | 2 |
| modal | 620 (282) | h3, 9×h4 | banner, main, form | 18 | 2 |

- **Componentes presentes (visíveis em alguma parada):** header (`<br-header>` 1.16.0), button
  (web component e classe), divider, avatar, sign-in, breadcrumb (`<br-breadcrumb>`), input
  (`<br-input>`), pagination (autoral `govbr-custom-pagination` com classes do core), select (autoral
  `br-select-pnip`), tab, table, tag, list, item, textarea, modal, scrim; checkbox por anatomia
  equivalente (input nativo). br-radio só não visível.
- **Estruturas:** `<title>PNIP</title>` em todas as rotas; `lang="pt-br"`; nenhum rodapé nem skip link;
  breadcrumb em todas as rotas; tabela de 9 colunas na lista (10 linhas), de 3 no detalhe; 19 campos
  desabilitados com rótulo no detalhe; `<form>` no detalhe; 0 animações; documento com 1364 px de
  largura na lista (rolagem horizontal, README-MOCK § 8.6).
- **Tipografia:** "Rawline, Raleway, sans-serif" em todo texto; Rawline carregada localmente.
- **Foco:** outline dashed 4 px `#c2850c` ou box-shadow 2 px `#c2850c` em todo ponto, anel do
  navegador nas caixas nativas; fora da conta os dois botões de calendário dos `<input type=date>`
  (shadow fechado do navegador).
- **Achado de medida:** focar a busca recarrega a lista (fica vazia por < 1 s e volta igual); com Tab
  rápido o foco pula a tabela. Por isso a ordem de Tab é medida com 300 ms por tecla.

## 5. Tabela de decisão (§ 3.2–3.3) — `node tela-b/vistorias/montar-decisoes.mjs`

As **186** regras de `rules.jsonl` têm uma linha cada em `decisoes.json` (as 45 com `emagReferences`
são as recomendações do e-MAG 3.1): `conforme` 30 · `viola` 15 regras (→ 24 specs, 96 unidades) ·
`não-mensurável` 22 (→ escaladas) · `não-aplicável` 45 · `observação` 31 · `não normatiza` 43.
Nenhum filtro por `automatable`/`automationConfidence`/`validationStrategy`.

**Unidades** (família pela regra: F1 componente, F2 página/template, F3 fundamentos, F4 e-MAG; `global`
= regra global da KB fora das quatro):

| Spec | Estado | Âncora (escopo, n) | Regras | Fam. | Medida |
|---|---|---|---|---|---|
| B-01 | sempre | `pnip-root` (único) | 7d2b85f81c52 · emag:1.5 · wcag:2.4.1 | F4 | 0 âncoras `#`, 0 skiplink; 1º Tab = Menu — **exposto** |
| B-02 | inicial | `pnip-propesc-vistorias h2` (único) | 3ac0aaa53900 · emag:1.3 | F4 | único título h2, nenhum h1 — **exposto** |
| B-03 | inicial | `… table` (único) | cd705eb5da2a · emag:3.9 | F4 | sem caption/aria-label; nome "" |
| B-04 | inicial | busca `>>> input` (único) | b95c42b61ed3 · emag:6.2 · b5fad7ce076d | F4 | só placeholder |
| B-05 | inicial | datas `>>> input` (todos, 2) | idem | F4 | sem rótulo |
| B-06 | inicial | caixas da tabela (todos, 11) | idem | F4 | sem rótulo; nome "" |
| B-07 | inicial | olho `>>> button` (todos, 10) | 7e6420514860 · emag:1.1 · wcag:4.1.2 | F4 | nome acessível "" |
| B-08 | inicial | ações da linha `>>> button` (todos, 40) | component-button-4d7b5f978df1 | F1 | só ícone, sem circle |
| B-09 | inicial | "Buscar" (único) | idem | F1 | só ícone, sem circle |
| B-10 | inicial | "Exibir lista" (todos, 2) | idem | F1 | só ícone, sem circle |
| B-11 | inicial | etiquetas de filtro (todos, 4) | e6fd5e1247de · emag:2.1 · f639993e9416 · emag:2.2 · 41850b4791b8 | F4 | clique 3/3, Enter 0/3, fora do Tab |
| B-12 | inicial | status "Vistoria agendada" (todos, 10) | cb09bc0c77c0 · emag:4.1 | F4 | 3,14:1 |
| B-13 | inicial | "Nenhum filtro de data aplicado" (único) | idem | F4 | 1,5:1 |
| B-14 | sempre | inicial do avatar (único) | idem | F4 | 2,33:1 |
| B-15 | detalhe-menu | `pnip-header hr.solid` (único) | foundation-global-21b1a2733f7b | F3 | borda 2 px `#bbb`, fora da paleta |
| B-16 | detalhe-menu | ícone do "Sair" (único) | 3a3e47354c53 · emag:3.6 | F4 | sem `alt` — **exposto** |
| B-17 | detalhe-menu | `#avatar-menu` (único) | e038367bd7d6 | global | role=menu, 0 menuitem — **exposto** |
| B-18 | detalhe-menu | `button.br-item` "Sair" (único) | 7e6420514860 · emag:1.1 · wcag:4.1.1 | F4 | `href` em `<button>`, `<p>` dentro — **exposto** |
| B-19 | detalhe-menu | "Trocar unidade" (único) | 2.1, 2.2, 41850b4791b8, accessibility-list-03813ffeeb42 | F4/F1 | clique navega, Enter não, fora do Tab |
| B-20 | detalhe-menu | textarea do motivo (único) | 6.2 · b5fad7ce076d | F4 | `<label>` irmão sem `for` |
| B-21 | detalhe | `… h3` (único) | 3ac0aaa53900 · emag:1.3 | F4 | começa em h3, sem h1/h2 — **exposto** |
| B-22 | detalhe | tabela do detalhe (único) | cd705eb5da2a · emag:3.9 | F4 | sem caption |
| B-23 | detalhe | "0%" (único) | cb09bc0c77c0 · emag:4.1 | F4 | 3,54:1 |
| B-24 | modal (condicional) | `.br-modal` (único) | e038367bd7d6 | global | sem role/aria-modal/nome; 0 dialog na árvore |

**Escolhas de forma (§ 5 do método).**
- **B-01** é defeito de ausência ancorado no contêiner raiz da aplicação (`pnip-root`), onde o template
  autoral começa; `sempre`, porque a medida vale nas quatro paradas.
- **Mesmo template em dois segmentos conta uma vez.** Os dois detalhes (não comparecimento e
  preenchido) são a mesma rota e o mesmo componente; defeitos do template comum (títulos) são ancorados
  só na parada `detalhe` (B-21). Na `detalhe-menu` só entra o que é dela (menu, textarea).
- **`todos` nas linhas da tabela** (B-06, B-07, B-08, B-12): cada elemento carrega o defeito por si
  (critério do D-33); por isso 40 das 96 unidades são de B-08. O peso vai à autora (E-19).
- **Predicados** (`acceptance`): B-11 e B-19 `atributos-ausentes` [tabindex, role]; B-15
  `cor-de-borda-pintada` [rgb(187,187,187)]; B-16 `atributos-ausentes` [alt]; B-24 `atributos-ausentes`
  [role, aria-modal, aria-label, aria-labelledby]. B-07 fica sem predicado porque o botão tem
  `aria-label=""` (presente, vazio) — a espécie mede presença. As demais ficam sem predicado e a medida
  mora em `conferir-auditoria.mjs` (precedente da tela A).
- **Controles conformes** (`_meta.conformes`, 12): C-01 paginação circular com nome; C-02 "Limpar
  Filtro" com texto; C-03 "Exibir"/"Página" com `label for`; C-04 os 19 campos do detalhe com label; C-05
  nome da embarcação ≥ 4,5:1 (12,63:1); C-06 "Excluir" com nome; C-07 abas `<button>` no Tab (Enter ≡
  clique); C-08 campo do modal com label; C-09 links de página no Tab; C-10 Home do breadcrumb no Tab;
  C-11 divisor fora do foco e da árvore; C-12 avatar circular.

Demais linhas `required`/`prohibited` (resumo; o JSON tem medida e citação de cada uma): **conforme** —
breadcrumb por Tab, input por Tab, modal com navegação interna, abas por teclado, avatar circular,
checkbox para seleção múltipla, sign-in em uma linha, tabela com colunas, divisor ignorado, item
(4 regras), Rawline, ordem das dependências, scripts sem type redundante, truncamento proibido (nada de
título/rótulo/botão/mensagem recortado; o "Selec" do README não aparece), 1.6 tabelas só de dados, 1.7
links adjacentes, 1.9 nada abre sozinho, 2.3, 2.4, 2.6, 2.7, 3.1, 3.4 (breadcrumb), 4.4 (foco), 5.5,
6.3, 6.4. **não-aplicável** — componentes ausentes, vídeo/áudio/CAPTCHA/mapa, zoom 200 % e outras
janelas (fora do escopo), regras de código-fonte/processo (build sem fonte), empty state e erros
(fora das paradas).

## 6. Observações (`recommended`/`discouraged`/`permitted`, nunca unidade)

Todos os botões visíveis alcançáveis por Tab e acionáveis por Enter (button-efd2d9e7c3c6,
41d9f439e103); br-modal sem aria-label/aria-modal (modal-31c45e5f6081, 65446caf1efc — ver B-24); dois
botões de ação no modal (091e0e012f86); coluna "Vistoriador" vazia em parte das linhas (dado) e
cabeçalho da coluna de ações vazio (table-88941e76c77b); 4 ícones de ação por linha
(table-8b8d4b403cb9); nenhum CDN (0b73051d7063); Raleway como alternativa (c6889731433a); web components
1.16.0 + CSS do core (4a614a5c88e2); sem Skip Link no Template Base (2387114907b1, ver B-01). Fora de
norma aplicável (registro): tabela passando de 1280 px (documento 1364 px); focar a busca recarrega a
lista; valores de dados fictícios recortados em campos desabilitados do detalhe.

## 7. Fundo (`_meta.fundo`, não é unidade)

1. **DS 3.4.1/1.16.0:** `alt="logo"` fixo no logo do `<br-header>`; item atual do `<br-breadcrumb>` sem
   `aria-current` (shadow root); "Home" visualmente oculto do breadcrumb; tamanhos 32×32/40×40 dos
   botões dos web components; grid de 24 px do core (ver E-08).
2. **Bibliotecas de terceiros:** SweetAlert2, Summernote — nenhuma visível nas paradas.
3. **Isolamento/mock:** nenhuma perda medida (fontes e ícones locais, 0 externos, 0 escritas). Os links
   do breadcrumb apontam para `/portal-mpa…` sem `/pnip/` e recarregam o documento: artefato da
   hospedagem sob `/pnip/` (em produção o app está na raiz).

## 8. Lista escalada à autora

Cada item: medida + pergunta. O que a autora incluir entra com `origem: "autora"` na descrição.

> **Decidida em 2026-10-01 (D-61).** Resultado item a item em `recomendacoes-escaladas.md` §
> "Decisão da autora" e em `ground-truth-vistorias.json › _meta.escaladas`. Viraram unidade E-01, E-04,
> E-06 e E-07 (B-25…B-29), E-18 virou o controle C-13, e E-20 ficou fora porque a medida desmentiu a
> premissa. A tabela abaixo é o registro da escalada como foi feita, sem alteração.

| # | Normas | Medida | Pergunta |
|---|---|---|---|
| E-01 | 5d5a5f21d94b · e-MAG 3.3 | `<title>PNIP</title>` na lista e nos dois detalhes; títulos visíveis "Vistorias" (h2) e o nome do programa (h3) | Um título que só nomeia o sistema e não muda entre rotas viola a 3.3? Se sim: unidade em `title`, `único`, estado `sempre`. |
| E-02 | bfba9c1f5026 · 1.8; template-global-19f93475dc5e | marcos banner, main, navigation ×3 (lista) / form (detalhe); nenhum footer/contentinfo/.br-footer em nenhuma parada; **exposto** (D-54..D-56) | A falta de rodapé viola a 1.8 ou o Template Base? Se sim: ausência ancorada em `pnip-root`. |
| E-03 | c2f94bdc17ce · 4.2; e038367bd7d6 | aba ativa (`li.tab-item.active`) e página atual (`a.page.active`) só por classe; nenhum `aria-selected`/`aria-current`/`aria-pressed` | Estado só por classe/cor viola a 4.2 ou a regra de ARIA de widget? Se sim: 1 unidade na aba ativa e 1 no link da página atual? |
| E-04 | 1ccbc61dddbc · 3.10 | tabela da lista: 9 `th scope=col`; dois sem texto (o da coluna de caixas, com um checkbox sem nome, e o da coluna de ações) | Cabeçalho vazio é associação incorreta de células? Se sim: `todos` nos 2 `th`. |
| E-05 | 79db88c7f55d · 1.4; cb56ad444da2; 21fbcc2fe37b | no "Exibir"/"Página", o foco passa do campo para a lista aberta (`div.br-list tabindex=0`, só a sombra que já tinha, sem outro indicador) e o Tab seguinte cai no `<body>` | Isso quebra a sequência lógica de foco (1.4) e/ou o indicador (4.4)? Se sim, em qual elemento? |
| E-06 | accessibility-modal-64b84991229c; 5be1f553cc03 · 1.9 | modal: Tab percorre lista de embarcações, Cancelar, Trocar e depois sai para os botões do detalhe e o cabeçalho por trás do scrim | O foco não ficar contido no modal viola a regra do modal ou a 1.9? |
| E-07 | foundation-global-1c0146e93d2e | ícones interativos < 48×48: ações de linha 78×40 (br-button padrão), Buscar 32×32, Exibir lista 32×32, paginação 40×40, Menu e Home 32×32 (web components) | Quais são tamanho padrão do DS (fundo) e quais escolha autoral (unidade)? |
| E-08 | foundation-global-0578aa6c2828 | grid do core 3.4.1: 12+12 px (24 px) entre colunas; KB 3.7.0: 40 px | Valor que difere entre versões (método § 1.4): fica fora? |
| E-09 | component-input-3788829b08fe | "Buscar" (lupa, 32×32, `button.br-button` não circular) é irmão do `br-input`, fora dele | É a "ação interna padrão do Input"? Se sim: unidade no botão (além de B-09). |
| E-10 | 1cb2c878824b · 1.2; 2f22b7245ef9 | etiquetas de filtro e "Trocar unidade" são `<span>` clicáveis (o defeito de teclado já é B-11/B-19) | O uso de `<span>` como controle é uma segunda unidade (1.2) nos mesmos elementos? |
| E-11 | 7e6420514860 · 1.1 (camadas) | estilos inline autorais: `style="cursor: pointer"` nas etiquetas e em "Trocar unidade", `border-radius`/`width` inline nas etiquetas de status | Estilo inline viola a separação de camadas da 1.1? |
| E-12 | 20c08f26d8e8 · 3.12; fb83eab75d8d · 3.11; 1db13803cbf8 · 3.2 | siglas sem expansão no texto fixo: RAEP, TIE, UF (detalhe), PNIP (título) | Alguma vira unidade, ou fica fora como linguagem (§ 6)? |
| E-13 | cdfbb56eebc5 · 3.5 | links de paginação com texto "1"…"4" e `href="javascript:void(0)"` | O texto dos links viola a 3.5? |
| E-14 | 11ffc5c577f6 · 6.7; 01b1806c30e9 · 6.5 | detalhe: 19 campos desabilitados agrupados por `<h4>`, nenhum fieldset/legend; campos de data sem rótulo nem instrução | Um formulário só de exibição exige fieldset? Falta de instrução nas datas é unidade além de B-05? |
| E-15 | component-global-e30aab6e9a68 | `<br-header has-menu>`: o botão Menu não faz nada (clique e Enter 0/3); `br-select-pnip` usa botão não circular; **exposto** (E-05 de /privacidade) | Defeito autoral ou do DS? Sob qual norma? |
| E-16 | pattern-global-5717506ac2e6 | nenhum link/item de ajuda nas paradas | Marcar `não-aplicável` (regra de produto)? |
| E-17 | pattern-global-eebb093156e7 | seções do detalhe recolhidas por um br-button "Mostrar" (chevron) à direita; o título da seção não aciona | É o Collapse da regra? Se sim: unidade nos botões "Mostrar"? |
| E-18 | component-scrim-d5ba51dda2b0 | o scrim do br-modal cobre a página inteira | Há justificativa clara (modal) — conforme? |
| E-19 | (forma, D-33) | B-06 (11), B-07 (10), B-08 (40), B-12 (10) são `todos` sobre linhas da tabela: 71 das 96 unidades | Manter `todos` (cada elemento carrega o defeito) ou `composicao` por coluna (4 unidades)? |
| E-20 | 7e6420514860 · 1.1 / 4.1.2 | o botão com ícone `user-times` (remover vistoriador) tem o mesmo nome do `user-plus`: title "Atribuir vistoriador" | Nome que não corresponde à ação é defeito medível? Se sim: `todos` nos `user-times` da página. |

## 9. Marcas `exposto` (§ 7 do método, adendo § E)

| Unidade | Exposição |
|---|---|
| B-01 (sem salto) | casco do D-54..D-56 (skip link) e D-53 no índice de memória |
| B-02, B-21 (títulos) | casco do D-54..D-56 (ordem de títulos) |
| B-16, B-17, B-18 (menu do avatar) | auditoria de /privacidade, E-06 (lida antes desta) |

**Com e sem exposição:** 24 specs / **96 unidades** com as marcadas; **18 specs / 90 unidades** sem
elas (as famílias com unidade continuam F1, F3, F4). E-02 e E-15 também são expostas.

## 10. Fora do escopo

Outras janelas e zoom; rotas fora de `vistorias/` (portal, login); vistas excluídas no § 3.3; linguagem
e microcopy (E-12 decide); conteúdo das fixtures; popup de assinatura e `redirect_uri`; relógio;
interceptor; os defeitos do README-MOCK § 8.6 que não aparecem numa parada (término anterior ao início,
"Exibir 25/50" em página > 1, filtro pelo 1º caractere) ou sem norma aplicável (tabela passando de
1280 px; "Hora da vistoria" vazia — visível nos dois detalhes, valor "" num campo desabilitado com
rótulo: valor de dado, não rótulo, título nem mensagem).

## 11. Portão (partes do auditor), limiar e desvios

| Passo | Resultado |
|---|---|
| `node tela-b/vistorias/conferir-auditoria.mjs` | **120/120** (manifesto; referência × sequência; em cada parada path, documento, escritas/externos e contagem de cada âncora; segmento 2 inalterado; condicional de B-24; medida de cada uma das 24 specs; os 12 conformes; linhas conformes de decisoes.json; gestos, Tab e árvore de acessibilidade em cargas auxiliares) |
| `APP_URL=http://127.0.0.1:3217 npm run conferir:referencia -- --tela vistorias` (servidor `tela-b/vistorias/servir.mjs 3217`) | **passa**: 4 estados em 3 segmentos, 24 specs, 96 unidades; predicados de B-11, B-15, B-16, B-19, B-24 **sustentam** |
| `npm run test:isolation -- --tela fluxo` / `solicitacao` / `vistorias` | 53/53 · 53/53 · 54/54 (só as linhas de contagem lidas) |
| `npm run typecheck` | passa |
| `node tela-b/conferir-auditoria.mjs` / `node tela-b/login/conferir-auditoria.mjs` | 43/43 · 40/40 (intactos) |
| `telas.json › vistorias.reference` | apontado para o arquivo só durante o portão; **voltou a `null`** (diff vazio) |
| re-medida do segundo agente | **pendente** (§ 12) |
| ratificação da autora | **pendente** |

**Limiar de finura (método § 9, adendo § A):** 96 unidades (≥ 8), unidades em **3** das 4 famílias
(F1, F3, F4; F2 sem unidade), **12** controles conformes (≥ 4). **A tela não é fina.** Sem as unidades
expostas: 90 unidades, as mesmas 3 famílias. O peso de B-08 (40 unidades de uma regra) vai à E-19.

**Desvios e notas.**
1. **`navigate` por `path`, não por clique**, nos dois detalhes: as linhas escolhidas estão na página 2;
   o clique exigiria trânsito pela paginação, cujo redesenho corre contra o clique no olho (a mesma
   posição da página 1 seria clicada). O adendo prefere o clique; não o exige.
2. **Escrita no mock** lida no registro do próprio mock além do log de rede: o backend é um interceptor
   dentro da página, que não gera requisição.
3. **Sondagens exploratórias antes da escolha.** Antes de a escolha gulosa rodar, scripts de
   exploração (apagados) leram fatos da lista que também são medidas de defeito (títulos, rótulos,
   contraste, focabilidade das etiquetas, cores) e abriram detalhes por `path` com uuids da semente. A
   escolha em si é mecânica sobre `estados.json` e não lê nenhuma dessas medidas; declarado porque o
   adendo pede a escolha "antes de procurar defeito".
4. **Uma linha representa as iguais** na escolha (as 10 linhas da tabela dão as mesmas vistas; a 1ª
   entra, pelo desempate de ordem). No teste de estados todas foram testadas.
5. **`dialogo` inclui o sobreposto modal** na escolha (definição do adendo § B.3); o teste só registra o
   papel ARIA, e o br-modal não tem papel (B-24).
6. **Hidratação:** `whenDefined` de cada `br-*` com teto de 3 s por tag (tags `br-*` sem definição, como
   `br-select-pnip`, que é componente Angular, não resolveriam nunca).
7. **Ordem de Tab com 300 ms por tecla** (§ 4); os 2 botões de calendário dos campos de data ficam fora
   da conta do indicador de foco (shadow fechado do navegador).
8. **`check-reference.ts` não fixa o fuso** (`America/Sao_Paulo`); nenhuma âncora depende de data.
9. O detalhe das outras 31 linhas da aba padrão foi aberto uma vez cada, só para descobrir ações
   (fase 1); os gatilhos foram testados 3/3 nas bases da fase 2.
10. Nenhum arquivo cego aberto; nenhuma ferramenta MCP do validator; nada de axe/ESLint;
    `test:isolation` rodou o validator por dentro e só as linhas de contagem foram lidas. Do validator
    foram lidos só `data/knowledge/versions/3.7.0/normalized/` (rules.jsonl, emag.json,
    components/*.json, tokens/colors.json).

## 12. Re-medida independente (segundo agente)

Segundo agente, contexto novo, em 2026-09-30. Entrada única: `ground-truth-vistorias.json` (`specs` e `_meta`) mais os dois documentos de método. Não li nada mais desta pasta, nem `.mjs`, nem `results/`, nem validator/axe/ESLint. Código próprio: `tela-b/vistorias/remedida/remedir.mjs` (headless; servidor estático próprio de `govbr-corpus/public/` com fallback SPA sob `/pnip/`; tudo fora da origem abortado; 1280×900, `America/Sao_Paulo`, relógio fixo 2026-03-16 09:30; o `setup` refeito por mim e `location.pathname` conferido nas 4 paradas: 4/4). Saída: `remedida/resultado.json`. Zero requisições externas, zero escritas no mock.

**Resultado.** Specs: 24 confirmadas, 0 divergem, 0 inconclusivas. Unidades cobertas: 96/96 (contagem de âncora igual a `expectedCount` em todas as specs). Conformes: 12/12 confirmados. Nenhuma divergência aberta de medida.

**Método por tipo.** Contagem: seletor próprio que desce shadow roots abertas e entende `>>>`. Nome acessível: CDP `Accessibility.getPartialAXTree`/`getFullAXTree`. Contraste: fórmula WCAG sobre cores computadas, com composição de alfa e primeiro fundo opaco. Foco: `Tab`/`Shift+Tab` reais, lendo `activeElement` através das shadow roots. Efeito de clique e Enter: 3 cargas novas por etiqueta (B-11), comparando assinatura da página antes e depois.

**Observações que não mudam veredito (honestidade sobre o que a medida mostrou além do claim):**

1. B-04: o DOM confirma (sem `label`, `aria-label`, `aria-labelledby`), mas a árvore de acessibilidade dá nome "Pesquise aqui ..." (o Chromium usa o placeholder como nome de reserva). A descrição de B-04 só afirma ausência de rótulo e que há "só o placeholder", então confirma; B-05, B-06 e B-20 têm nome AX vazio, como afirmam.
2. Ordem de Tab (C-09, C-07, C-10, B-11, B-19): em Chromium headless, o `Tab` para frente a partir do início do documento passa dos campos de data direto para o último botão da página, pulando a tabela e a paginação; o `Shift+Tab` a partir do fim percorre tudo, inclusive os 4 links `a.page` (4/4), as caixas e os botões da linha. Os 4 links têm `tabIndex` 0 e `href`. C-09 confirma por essa via (frente 0/4, trás 4/4), não por "Tab para frente desde o topo". Quem reproduzir só a caminhada para frente vai ver 0/4. Não investiguei a causa (suspeita: interação do foco sequencial com o campo `type=date`); vale a autora saber que a ordem para frente da lista é incompleta nessa medida.
3. B-01: nas paradas com menu aberto ou detalhe, o primeiro `Tab` já parte do ponto de início sequencial deixado pelo clique do `setup` (caiu em "Sair" e em "Home"), então "o primeiro ponto de Tab é o botão Menu" só se reproduz na parada `inicial` (confirmado: `button#navigation`). O defeito (nenhuma âncora `#…` nem `.br-skiplink` em nenhuma das 4 paradas) confirma igualmente.
4. C-02: o botão "Limpar Filtro" está `disabled` na parada `inicial` (sem filtro aplicado): tem texto visível e nome acessível "Limpar Filtro" (confirma), mas fica fora da ordem de Tab.
5. B-17: os 9 papéis descendentes na árvore AX não incluem nenhum `menuitem`; o próprio menu tem nome "Avatar com dropdown".
6. C-07: o teste Enter ≡ clique para a aba "Tramitando" (já ativa) é trivial, pois não há mudança em nenhum dos dois; as outras 2 abas mudam igual por Enter e por clique. C-09: idem para a página "1".

**Citação de norma (texto em `rules.jsonl`, 3.7.0).** Sustentam o claim: B-01 ("salto para o conteúdo o primeiro link da página"), B-03 (e-MAG 3.9, "Identifique tabelas com caption"), B-04/05/06/20 ("Associe label aos campos … usando for e id"), B-08..10 ("O Button deve possuir rótulo visível, exceto na variante circular"), B-11/B-19 ("Todas as funções devem ser operáveis por teclado"), B-12..14/B-23 ("contraste de pelo menos 4,5:1"), B-16 ("texto alternativo … imagens informativas"), B-17/B-24 ("Associe cada widget customizado ao role, estado e propriedade ARIA"), B-18, B-15, e os conformes C-01..C-12.

**Não sustentam inteiramente (para a autora decidir; nenhuma é erro de medida):**

- **B-07** (e **C-06**, mesma regra): `govbr-3.7.0-accessibility-global-7e6420514860` é a e-MAG 1.1, "Respeitar os Padrões Web" ("Mantenha HTML, CSS e JavaScript em camadas adequadas e siga padrões Web interoperáveis"). Não diz que todo botão precisa de nome acessível; essa exigência vem do `wcag:4.1.2`, que a KB só aceita como alias. O fato (botão com nome "" na AX) está confirmado, mas a âncora normativa é indireta. No B-18 a mesma regra serve (`href` em `<button>` e `<p>` dentro dele violam padrões Web).
- **B-02**: a regra 1.3 diz "Estruture títulos de H1 a H6 hierarquicamente; **prefira** um único H1". "Prefira" é fraco; a ausência de `<h1>` e o início em `h2` (B-02) e `h3` (B-21) são fatos confirmados, mas o texto não os torna violação sem juízo de leitura. Também pode ser lido como suportado.
