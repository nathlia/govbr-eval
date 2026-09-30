# Recuo da tela B — auditoria por medição de `real/pnip-login.html`

**Método:** `tela-b/metodo-auditoria.md`, congelado no commit **`5838702`** do `govbr-eval`; aplicado
aqui pelo § 9 (a tela B, auditada em `b6e8d7b`, saiu fina). "A mesma auditoria, por este mesmo
método (hashes e conferência de nomes refeitos para o login)".
**Executada em:** 2026-09-30, por assistente LLM (Claude), sem o oráculo, sob o D-48.
**Status:** referência **candidata** — falta a decisão da autora sobre a lista escalada (§ 7), a
re-medida do segundo agente (§ 10) e a ratificação no log. Nada commitado.

**A tela não está declarada em `telas.json`.** Declarar tela é decisão de instrumento, da autora;
`telas.json` não foi tocado. Por isso `conferir:referencia` e `test:isolation` não rodam para ela
(§ 9 abaixo).

Arquivos (em `govbr-eval/`):

| Arquivo | O que é |
|---|---|
| `tela-b/comum.mjs` | condições de medida; ganhou `HASHES_LOGIN`, `PAGINAS` e `paginaDeArgs` (`--pagina login`), padrão inalterado para a tela B |
| `tela-b/teste-estados.mjs --pagina login` | teste de estados (§ 2) |
| `tela-b/inventario.mjs --pagina login` → `tela-b/login/inventario.json` | inventário (§ 3.1) |
| `tela-b/login/montar-decisoes.mjs` → `tela-b/login/decisoes.json` | tabela de decisão (186 linhas) |
| `tela-b/login/conferir-auditoria.mjs` | conferência sem modelo (§ 8.2) |
| `ground-truth-pnip-login.json` | referência candidata `1.0.0-candidata` |

## 0. A tela nunca foi medida por agente — conferido pelos nomes de arquivo

2026-09-30, só por **nomes**, sem abrir conteúdo de resultado:

- `git -C govbr-eval log --all --name-only` com `login|pnip`: **nenhum** arquivo.
- `govbr-eval/results/` e `pipeline/` até a 3ª profundidade: nenhuma entrada com `real`, `login` ou
  `pnip` no nome.
- `govbr-ds-validator` (todo o histórico): nenhum arquivo com `pnip|login` no nome.
- `govbr-corpus`: `public/real/pnip-login.html` (a captura congelada) e `src/pages/LoginPage.tsx` — este
  é a fonte da **tela de fluxo** (identificação no gov.br, D-23), outra página, não esta rota.

Mesmo limite do método: execuções antigas da suíte `TC-*` cujos nomes não dizem a rota não são
cobertas pela conferência por nome.

## 1. Objeto e condições de medida

| Arquivo (`public/real/` = `dist/real/`) | sha256 medido |
|---|---|
| `pnip-login.html` (= `manifesto.json`) | `badd4707f5b59522a779143dc98b1bf68dd95cb938155d9118f0caaa48387c4f` |
| `manifesto.json` | `d03efe953d7bcc4fbf23e0270eaeee3af0e2f824a3f196bc155d3658c4f60227` |
| `assets/core.min.css` (3.4.1) | `cf176bd46bb3f8032991ef5c79ffe05997cd72d21951f287a6270fd05ed266aa` |
| `assets/webcomponents.umd.min.js` (1.16.0) | `c196dbc1a8f5af079bb4c8c50bedb883872b2fa3f0e86d3451182072b77ae478` |

A página carrega os mesmos dois ativos da tela B. Condições do § 1: servidor próprio do `dist/`,
Chromium do Playwright 1.61.1, 1280×900, Node 25.2.1. Como a tela não está em `telas.json`, os hosts
a abortar são os que o `<head>` da captura referencia — os mesmos três da tela B
(`cdngovbr-ds.estaleiro.serpro.gov.br`, `fonts.googleapis.com`, `cdnjs.cloudflare.com`, este também
pelo `@import` de Font Awesome 5.11.2 dentro do shadow root). **Ausentes medidos** (404):
`/real/assets/images/govbr-logo.png` e `/assets/images/exit-icon.png`. Nenhum outro host.

**Versão (§ 1):** cores e tamanhos medidos são tokens da base 3.7.0 (`#005ea2` = `--blue-vivid-60`,
`#1351b4` = `--blue-warm-vivid-70`, `#333`, `#fff`, `#ccc`; 34,832 px = `--font-size-scale-up-05`,
16,8 px, 14 px); nenhum valor difere só por versão. O único conflito encontrado não é de versão: é
entre o texto de uma regra e os tokens da própria base (grid, E-09).

## 2. Tratamento de versão

Ver o parágrafo "Versão" do § 1.

## 3. Teste de estados (§ 2)

`node tela-b/teste-estados.mjs --pagina login`. Espera: `whenDefined` de `br-header` e `br-button` +
seletor do cabeçalho; `_meta.waitFor` da referência = `br-button button.br-button`. Saída (resumida;
cada linha é 3/3 cargas novas):

```
página: /real/pnip-login.html
hashes: 8/8 conferem
6 gatilho(s) candidato(s):
  …br-header >>> …slot>button  <button#navigation> [shadow] visível "Menu"
  …pnip-header>div>div>button  <button#avatar-dropdown-trigger> NÃO renderizado "Avatar com dropdown"
  …pnip-header>div>div>button>span:nth-of-type(1)  <span> NÃO renderizado ""
  …pnip-header>div>div>div>button  <button> NÃO renderizado "Sair"
  …pnip-login>div>div:nth-of-type(2)>div:nth-of-type(2)>br-button >>> button  <button> [shadow] visível "Entrar com gov.br"
  …pnip-login>div>div:nth-of-type(2)>button  <button> visível "Problemas ou dificuldades? Contate nossa"
resultado: os 12 pares gatilho × gesto = sem-efeito 0/3 · dom igual · ax 29→29 · url igual · externos 0
  (os três não renderizados: clique = timeout de acionabilidade; Enter cai no body)
veredito: nenhum gatilho produz estado → tela de UM estado (inicial, afterStep 0, setup vazio)
```

**Veredito: (a) — um estado.** O botão "Entrar com gov.br" e o de ajuda perderam os bindings do
Angular (README da ala real); o botão Menu aponta para `#main-navigation`, que não existe. Nada
depende do Angular que tenha sido auditado.

## 4. Inventário (§ 3.1)

Completo em `tela-b/login/inventario.json` (70 elementos, 30 visíveis, 22 em shadow root).

- **Título/idioma:** `<title>PNIP</title>` (igual ao da política); `lang="pt-br"`.
- **Regiões:** `banner` (shadow do `<br-header>`) e `main`; sem `contentinfo`/`navigation`.
- **Títulos:** um só, `h2` "Acesso via gov.br" (34,832 px/700, `#005ea2`); **nenhum h1**.
- **Conteúdo:** `.row` com `.col-md-8.ml-4.pr-4` contendo `.image-container` **vazio (0×0, sem
  imagem de fundo)** e `.col.padding-login` com o h2, um parágrafo em `div.info` (14 px), o
  `<br-button label="Entrar com gov.br" type="secondary">` e um `<button class="br-button primary
  middle text-auto">` de ajuda feito à mão (ícone `fa-headset` com `aria-hidden`, texto dentro de
  `<slot>` no light DOM, `aria-label=""` vazio, atributo `_ngcontentwmyc1`).
- **Links:** 0 `a[href]`. **Formulário:** nenhum campo.
- **Focáveis / Tab real:** Menu (y=67) → "Entrar com gov.br" (y=320) → ajuda (y=400) → `body`.
- **Componentes:** renderizados — `<br-header>`, `.br-header`, `.br-divider`, `.br-button` ×3 (Menu
  `circle small`, Entrar `secondary middle`, ajuda `primary middle`), `<br-button>`; não
  renderizados (`.drop-menu-login`, `display:none`) — `.br-sign-in`, `.br-avatar`, `.br-list`, `.br-item`.
- **Cores:** `#333`, `#fff`, `#ccc`, `#005ea2`, `#1351b4` — todas token.
- **Contraste:** 6 nós de texto renderizados, mínimo 6,72:1 (h2); rótulos dos botões 7,33:1.
- **Foco:** os três focáveis: `outline: dashed 4px rgb(194,133,12)`, offset 4 px.
- **Transbordo:** o botão de ajuda (`white-space: nowrap`) mede 627 px e vai de x=873 a x=1501 —
  **passa da janela de 1280**; `scrollWidth` do documento = 1501 (rolagem horizontal). O texto cabe
  inteiro no botão. O `<head>` só tem os dois `<style>` do bundle do DS: **o CSS do componente
  Angular não veio na captura** (`.padding-login` e `.image-container` sem regra autoral).
- **Grid:** `--grid-gutter` computado 24 px (`--grid-desktop-gutter`); `--grid-breakpoint-xl` = 1600 px.
- **Animações:** 0.

## 5. Tabela de decisão (§ 3.2–3.3)

186 linhas em `tela-b/login/decisoes.json` (45 recomendações do e-MAG incluídas). Contagem:
`conforme` 21 · `viola` 4 (2 unidade, 2 fundo) · `não-mensurável` 12 · `não-aplicável` 75 ·
`observação` 31 · `não normatiza` 43.

| Regra | Fam. | Veredito | Medida |
|---|---|---|---|
| `7d2b85f81c52` · e-MAG 1.5 | F4 | **viola → L-01** | 0 `a[href]`, 0 âncora `#…`; 1º Tab = Menu |
| `3ac0aaa53900` · e-MAG 1.3 | F4 | **viola → L-02** | único título é h2; nenhum h1 |
| `1c0146e93d2e` ícone 48×48 | F3 | viola → fundo | Menu 32×32 (template do web component) |
| `3a3e47354c53` · 3.6 | F4 | viola → fundo | `alt="logo"` fixo no bundle; 404 |
| `7e6420514860` · 1.1; `1cb2c878824b` · 1.2; `2f22b7245ef9` | F4/global | não-mensurável → E-02 | botão de ajuda montado à mão; botão × link |
| `5d5a5f21d94b` · 3.3 | F4 | → E-01 | `PNIP` |
| `bfba9c1f5026` · 1.8; `19f93475dc5e` | F4/F2 | → E-03 | sem rodapé |
| `75c11ccac582` · 3.4 | F4 | → E-04 | sem breadcrumb |
| `e30aab6e9a68` anatomia | global | → E-05 | `has-menu` sem menu; hierarquia primary/secondary |
| `fb83eab75d8d` · 3.11, `20c08f26d8e8` · 3.12, `1db13803cbf8` · 3.2 | F4 | → E-07 | "GovBR", "online" |
| `0578aa6c2828` grid 40 px | F3 | → E-09 | gutter 24 px |
| `79db88c7f55d` · 1.4, `cb56ad444da2` | F4/global | conforme | Menu → Entrar → ajuda; sem tabindex positivo |
| `e6fd5e1247de` · 2.1, `f639993e9416` · 2.2, `41850b4791b8` | F4/global | conforme | 3 controles por Tab; Enter ≡ clique |
| `cd5de9a6f164` · 2.3, `d6e816588306` · 2.4 | F4 | conforme | sem meta http-equiv |
| `8faca42c2c9a` · 2.6, `33b13d9fa271` · 2.7, `6ea7ecc60c01` · 5.5 | F4 | conforme | 0 animações |
| `698e0a4783a9` · 3.1 | F4 | conforme | `pt-br` |
| `cb09bc0c77c0` · 4.1 | F4 | conforme | mín. 6,72:1 |
| `21fbcc2fe37b` · 4.4 | F4 | conforme | outline dashed 4px nos 3 |
| `21b1a2733f7b` cores | F3 | conforme | 5 cores, todas token |
| `406774b1cb87` Rawline | F3 | conforme | declarada/computada |
| `a43ad8231ad0`, `9826b6862644` | global | conforme | ordem do `<head>`; script sem type |
| `9d9f1c9bf1ed` truncamento | F2 | conforme | texto do botão cabe no botão |
| `5717506ac2e6` ajuda | F2 | conforme | botão de ajuda visível e nomeado |
| `component-button-4d7b5f978df1` | F1 | conforme | 3 Buttons: circular com nome; 2 com rótulo visível |
| `accessibility-divider-30bbcbf3a17c` | F1 | conforme | tabIndex −1; ignorado na árvore |
| `c2f94bdc17ce` · 4.2 | F4 | não-aplicável | nenhuma informação só por cor/forma |
| e-MAG 6.x, 3.5–3.10, 5.x | F4 | não-aplicável | sem formulário, link, tabela, mídia |
| signin/avatar/list/item | F1 | não-aplicável → E-06 | subárvore não renderizada |

**Forma das unidades.** L-01: defeito de ausência em `pnip-root`, `unico` (mesma justificativa da
tela B). L-02: ancora no próprio `h2` (`pnip-login h2`), `unico` — é o elemento cujo nível começa a
hierarquia em 2; a ausência do h1 e o nível do h2 são o mesmo conserto. Nenhuma das duas cabe nas
quatro espécies de predicado; a medida está em `conferir-auditoria.mjs`.

## 6. Observações e fundo

**Observações** (lista completa em `decisoes.json`): os três botões alcançáveis por Tab, sem efeito
por Enter/Espaço/clique (`button-efd2d9e7c3c6`, `button-41d9f439e103`); CDN do DS para Rawline
(`0b73051d7063`); cabeçalho e Entrar por web component, ajuda por CSS (`4a614a5c88e2`); grid de 12
colunas com a primeira vazia (`9ef740ba1f28`, `8e553b2c8bc7`); sem Skip Link (`2387114907b1`).

**Fundo** (`_meta.fundo`): (1) web component 1.16.0 — Menu 32×32, `alt="logo"` fixo, `@import` de
Font Awesome no shadow root; (2) captura/isolamento — logo e ícone de sair 404; Rawline, Raleway e
Font Awesome negados (`fa-bars`, `fa-headset` sem glifo); **CSS do componente Angular ausente da
captura** (`.image-container` 0×0, `.padding-login` sem regra).

## 7. Lista escalada à autora

| # | Normas | Medida | Pergunta |
|---|---|---|---|
| E-01 | `5d5a5f21d94b` · 3.3 | `<title>PNIP</title>`; único título da página "Acesso via gov.br" | Título só com a sigla do sistema viola a 3.3? Se sim, unidade em `title`. |
| E-02 | `7e6420514860` · 1.1; `1cb2c878824b` · 1.2; `2f22b7245ef9` | botão de ajuda: `<button class="br-button primary">` com `<slot>` no light DOM, `aria-label=""`, atributo `_ngcontentwmyc1`; "Entrar" e "Contate" levam a outra tela na aplicação viva | O botão montado à mão (anatomia interna do web component copiada) fere 1.1/1.2? Ações que navegam deveriam ser link? |
| E-03 | `bfba9c1f5026` · 1.8; `19f93475dc5e` | banner + main; sem rodapé; nenhuma regra `required` da KB exige rodapé textualmente | A falta de rodapé viola 1.8 ou o Template Base? **exposto** (D-54) |
| E-04 | `75c11ccac582` · 3.4 | sem breadcrumb/aria-current/nav | A falta de mecanismo de localização viola a 3.4 numa tela de acesso? |
| E-05 | `e30aab6e9a68` | Menu sem menu (`#main-navigation` inexistente, 3/3 sem efeito); ação principal "Entrar" em Button **secondary** e ajuda em Button **primary** | Algum dos dois é defeito autoral de anatomia/hierarquia? Sob qual norma? (a KB 3.7.0 não traz regra `required` de hierarquia de Button) |
| E-06 | `7e6420514860`; `e038367bd7d6`; `3a3e47354c53`; regras de avatar/sign-in/list/item | a mesma subárvore `.drop-menu-login` da tela B (`display:none`): `button[href]`, `<p>` em `<button>`, `img` sem `alt`, `role="menu"` sem `menuitem` | Conta (validade no DOM deste estado) ou é estado do Angular, fora do escopo? |
| E-07 | 3.11, 3.12, 3.2 | "GovBR"/"gov.br" sem explicação; "online" sem `lang` | Alguma vira unidade? |
| E-08 | (nenhuma `required` a 1280; 4.3 é zoom, fora do escopo) | botão de ajuda passa da janela (x 873→1501, `scrollWidth` 1501 em 1280); o CSS autoral do componente não veio na captura | O transbordo é defeito autoral, perda da captura (fundo) ou fora de norma? |
| E-09 | `0578aa6c2828` grid 40 px | `--grid-gutter` 24 px (token `--grid-desktop-gutter` igual em 3.4.1 e 3.7.0; 40 px é `--grid-tv-gutter`, ≥1600 px); o autor soma `ml-4 pr-4` à 1ª coluna (espaço entre colunas 36 px) | A regra, sem breakpoint, se aplica a 1280? Se sim, é do DS (fundo) ou do autor (`ml-4 pr-4`)? |

## 8. Marcas `exposto`

| Item | Exposição |
|---|---|
| **L-02** (sem h1) | **exposto** — README da ala real: axe `page-has-heading-one` no login (vivo e congelado). |
| **L-01** (sem salto) | **exposto** — índice de memória do assistente (D-53: restrição de página skip-link do validator 2.7.0); e a própria auditoria da tela B, que o auditor fez, achou o mesmo defeito no mesmo cabeçalho/raiz. |
| E-03 (rodapé) | **exposto** — D-54/D-55. |
| Tela inteira | plano da fatia 8 (`fatia8-telas-intocadas-plano.md`): "a login form again", "4 KB"; README: "estrutura" e axe 1 achado, 28 passes. A auditoria da tela B deu ao auditor o conhecimento completo do cabeçalho compartilhado (Menu sem menu, subárvore oculta, fundo). |

Sem as unidades marcadas, a referência candidata tem **0** unidades.

## 9. Portão e recuo

| Passo | Resultado |
|---|---|
| `node tela-b/login/conferir-auditoria.mjs` | **40/40** (4 hashes, 3 isolamento, 3 estado, 4 medidas das 2 unidades, 17 medidas cobrindo as 21 linhas `conforme`, 7 dos controles, 2 cobertura) |
| `npm run conferir:referencia` | **pendente — tela não declarada** em `telas.json` |
| `npm run test:isolation` | **pendente — tela não declarada** em `telas.json` |
| `npm run typecheck` | passa |
| `node tela-b/conferir-auditoria.mjs` (tela B, depois da mudança em `comum.mjs`) | 43/43 |
| re-medida do segundo agente / ratificação | pendentes |

**Recuo (§ 9):** 2 unidades (< 8), em **1** família (F4; < 3), 5 controles conformes (≥ 4). **O
login também é fino**, e mais fino que a tela B (3 unidades). **Nenhuma das duas passa do limite:
pelo § 9 não há bateria automática, e a autora decide** entre rodar uma tela fina declarando a baixa
resolução ou encerrar a tela B. As duas nunca se somam (D-13).

**Desvios e notas.**
- Hosts externos e ausentes vêm da medida desta captura, não de `telas.json` (a tela não está
  declarada); escritos em `conferir-auditoria.mjs`.
- `comum.mjs`, `teste-estados.mjs` e `inventario.mjs` ganharam `--pagina login` (padrão = tela B,
  comportamento da B inalterado; a lista tipográfica do inventário passou a incluir h2, `div.info` e
  botões — o `inventario.json` da B não foi regenerado).
- Cegueira: nenhum arquivo cego aberto, nenhuma ferramenta MCP do validator, nada de axe/ESLint.
  O plano da fatia 8 foi consultado só por `grep "login"` (três linhas).

## 10. Re-medida independente (segundo agente)

_(vazio — a preencher pelo segundo agente, em contexto novo, sob as mesmas regras de cegueira, com
código próprio.)_
