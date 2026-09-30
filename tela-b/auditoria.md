# Tela B — auditoria por medição (`real/pnip-privacidade.html`)

**Método:** `tela-b/metodo-auditoria.md`, congelado no commit **`5838702`** do `govbr-eval`
("Tela B: método da auditoria por medição, congelado antes da auditoria (D-49, D-56)").
**Executada em:** 2026-09-30, por assistente LLM (Claude), sem o oráculo, sob o D-48 (§ 7 do método).
**Status:** referência **candidata** — falta a decisão da autora sobre a lista escalada (§ 7), a
re-medida do segundo agente (§ 9) e a ratificação no log. Nada congelado, nada commitado.

Arquivos desta auditoria (todos em `govbr-eval/`):

| Arquivo | O que é |
|---|---|
| `tela-b/comum.mjs` | condições de medida do § 1 (hashes, servidor próprio do `dist/`, 1280×900, aborto dos externos) |
| `tela-b/teste-estados.mjs` | teste de estados do § 2 |
| `tela-b/inventario.mjs` → `tela-b/inventario.json` | inventário do § 3.1 |
| `tela-b/montar-decisoes.mjs` → `tela-b/decisoes.json` | tabela de decisão completa do § 3.2–3.3 (186 linhas) |
| `tela-b/conferir-auditoria.mjs` | conferência sem modelo do § 8.2 |
| `ground-truth-privacidade.json` | referência candidata `1.0.0-candidata` |

## 1. Objeto e condições de medida

Hashes **medidos** (sha256), idênticos em `govbr-corpus/public/real/` e `govbr-corpus/dist/real/`,
iguais aos do § 1 do método:

| Arquivo | sha256 medido |
|---|---|
| `pnip-privacidade.html` | `83d8e1973235dd08d2d14417c4764f78a566209c228a8af51211873a258f71a7` |
| `manifesto.json` | `d03efe953d7bcc4fbf23e0270eaeee3af0e2f824a3f196bc155d3658c4f60227` |
| `assets/core.min.css` | `cf176bd46bb3f8032991ef5c79ffe05997cd72d21951f287a6270fd05ed266aa` |
| `assets/webcomponents.umd.min.js` | `c196dbc1a8f5af079bb4c8c50bedb883872b2fa3f0e86d3451182072b77ae478` |

`dist/real/` já existia (não foi preciso build). Servidor próprio em porta efêmera de `127.0.0.1`;
Chromium do Playwright 1.61.1; Node 25.2.1 (`.node-version`); janela 1280×900. Pedidos da carga:
os três hosts de `isolamento.externos` pedidos e **abortados** (`rawline.css`, Raleway, Font Awesome
5.15.4 — e, de dentro do shadow root do `<br-header>`, Font Awesome 5.11.2, mesmo host
`cdnjs.cloudflare.com`); os dois `ausentes` respondem 404; nenhum outro host.

## 2. Tratamento de versão (§ 1)

- Cores e tamanhos computados foram confrontados com os tokens da base 3.7.0 (`tokens/colors.json`,
  `tokens/typography.json`): `#333` = `--gray-80`, `#fff` = `--pure-0`, `#ccc` = `--gray-20`, foco
  `#c2850c` = `--gold-vivid-40`; tamanhos 41,804 / 29,036 / 16,8 / 14 px = `--font-size-scale-up-06`
  / `-up-04` / `-up-01` / `-base`. **Nenhum valor difere só por versão** → nenhuma escalada de token
  por versão (§ 1.4).
- Nenhuma regra caiu em `não-aplicável (versão)`: as regras de componente aplicáveis (Button,
  Divider) são materializadas pelo pacote 1.16.0 congelado (classes `br-button circle`, `br-divider`
  medidas no shadow root).

## 3. Teste de estados (§ 2)

Script: `node tela-b/teste-estados.mjs`. Espera: `whenDefined` de cada `br-*` presente
(`br-header`) + seletor `br-header header.br-header .header-title` (vira `_meta.waitFor`). Gatilhos
enumerados mecanicamente (light DOM + shadow roots abertas); cada gatilho × gesto em 3 cargas novas.
Saída (2026-09-30):

```
hashes: 8/8 conferem
4 gatilho(s) candidato(s):
  body>pnip-root>pnip-header>br-header >>> header>div>div:nth-of-type(2)>div>div:nth-of-type(1)>slot>button  <button#navigation> [shadow] visível "Menu"
  body>pnip-root>pnip-header>div>div>button  <button#avatar-dropdown-trigger> NÃO renderizado "Avatar com dropdown"
  body>pnip-root>pnip-header>div>div>button>span:nth-of-type(1)  <span> NÃO renderizado ""
  body>pnip-root>pnip-header>div>div>div>button  <button> NÃO renderizado "Sair"

resultado por gatilho × gesto:
  sem-efeito  clique 0/3 …slot>button · dom igual · ax 573→573 · +visíveis 0 · aria-expanded — · url igual · externos 0
  sem-efeito  enter  0/3 …slot>button · dom igual · ax 573→573 · +visíveis 0 · aria-expanded — · url igual · externos 0
  sem-efeito  clique 0/3 …div>div>button — erro: elementHandle.click: Timeout 2000ms exceeded. · dom igual …
  sem-efeito  enter  0/3 …div>div>button · dom igual …
  sem-efeito  clique 0/3 …button>span:nth-of-type(1) — erro: Timeout 2000ms exceeded. · dom igual …
  sem-efeito  enter  0/3 …button>span:nth-of-type(1) · dom igual …
  sem-efeito  clique 0/3 …div>div>div>button — erro: Timeout 2000ms exceeded. · dom igual …
  sem-efeito  enter  0/3 …div>div>div>button · dom igual …

veredito: nenhum gatilho produz estado → tela de UM estado (inicial, afterStep 0, setup vazio)
```

**Veredito: resultado (a) — tela de um estado.** O cabeçalho (`<br-header has-menu>`) renderiza um
botão Menu com `data-target="#main-navigation"`; esse alvo não existe na página, e nem clique real nem
Enter mudam DOM (com shadow roots), árvore de acessibilidade ou URL, em 3/3 cargas. O avatar/sign-in
(`#avatar-dropdown-trigger`, `.br-avatar`) e o botão "Sair" estão dentro de `.drop-menu-login` com
`style="display: none;"` inline (binding de sessão do Angular): não são renderizados, o clique real
não os alcança (timeout de acionabilidade) e o Enter cai no `body`. Nenhum efeito parcial (caso c).
`telas.json › privacidade.isolamento.interacao` continua `null`.

## 4. Inventário (§ 3.1)

Completo em `tela-b/inventario.json` (195 elementos, 162 visíveis, 17 em shadow root; papel e nome
de cada um pela árvore do Chromium). Resumo:

- **Título/idioma:** `<title>PNIP</title>` (idêntico ao da captura `pnip-login`); `<html lang="pt-br">`.
- **Regiões (árvore de acessibilidade):** `banner` (o `<header>` dentro do shadow root do
  `<br-header>`) e `main` (`main.container-lg`). Nenhum `contentinfo`, `navigation`, `complementary`.
  Nenhum rodapé, skip link ou breadcrumb.
- **Cabeçalhos:** `h1` (único, primeiro) + 16 `h3`; nenhum `h2`. Todo `h3` envolve o texto em
  `<strong>`. **12 pseudo-títulos** `<p><strong>…</strong></p>` (16,8 px, peso 700).
- **Listas:** 4 `<ul>` com 5, 2, 13 e 6 `<li>`; nenhum filho fora de `<li>`.
- **Links:** 0 `a[href]` na página inteira (light + shadow).
- **Imagens:** logo do `<br-header>` (shadow, `alt="logo"`, 404) e `img` sem `alt` dentro do botão
  "Sair" (não renderizado, 404).
- **Focáveis / ordem de Tab (Tab real):** um único ponto de parada — o botão Menu do cabeçalho —,
  depois `body`, depois de novo o botão. Nenhum `tabindex` positivo.
- **Componentes presentes:** renderizados — `<br-header>` (web component 1.16.0), `.br-header`,
  `.br-button` (Menu, `circle small`), `.br-divider` (vertical); **não renderizados** (subárvore
  `.drop-menu-login`, `display:none`) — `.br-sign-in`, `.br-avatar`, `.br-list` (`role="menu"`),
  `.br-item`.
- **Elementos fora do HTML:** `<privacidade>` (HTMLUnknownElement; contém todo o conteúdo). Os
  demais custom elements (`pnip-root`, `pnip-header`, `router-outlet`, `br-header`) têm hífen.
- **Cores computadas visíveis:** `rgb(51,51,51)`, `rgb(255,255,255)`, `rgb(204,204,204)`.
- **Tipografia computada:** família `Rawline, Raleway, sans-serif` (a fonte não carrega: isolamento);
  h1 41,804 px/300, h3 29,036 px/500, p 16,8 px/400, li 14 px/400; h1 e parágrafos `text-align: justify`.
- **Contraste:** 111 elementos com texto próprio, todos com fundo opaco resolvido; mínimo 12,63:1.
- **Foco:** botão Menu com foco de teclado = `outline: dashed 4px rgb(194,133,12)`, offset 4 px.
- **Animações:** `document.getAnimations()` = 0 (na carga e 3 s depois). Nenhum truncamento.

## 5. Tabela de decisão (§ 3.2–3.3)

As **186** regras de `rules.jsonl` têm uma linha cada em `tela-b/decisoes.json` (as 45 com
`emagReferences` são as recomendações do e-MAG 3.1, que assim também têm linha). Contagem:
`conforme` 20 · `viola` 5 (3 unidade, 2 fundo) · `não-mensurável` 12 (→ escalada) ·
`não-aplicável` 75 · `observação` 31 (recommended/discouraged/permitted) · `não normatiza` 43
(example/informative). Nenhum filtro por `automatable`/`automationConfidence`/`validationStrategy`.

Linhas `required`/`prohibited` que não são `não-aplicável` por ausência trivial (sem tabela, sem
formulário, sem mídia, componente ausente — ver o JSON):

| Regra (KB / e-MAG) | Fam. | Veredito | Medida (resumo) |
|---|---|---|---|
| `7d2b85f81c52` · 1.5 atalhos / salto | F4 | **viola → B-01** | 0 `a[href]`, 0 âncora `#…`; 1º Tab = botão Menu |
| `3ac0aaa53900` · 1.3 títulos | F4 | **viola → B-02** | h1, 16×h3, nenhum h2; salto no 1º h3. Parte conforme: h1 único (C-01) |
| `7e6420514860` · 1.1 padrões Web | F4 | **viola → B-03** | `<privacidade>`: sem hífen, HTMLUnknownElement. `<br-header>` válido (C-02) |
| `1c0146e93d2e` ícone 48×48 | F3 | viola → **fundo** | botão Menu 32×32, tamanho do template do web component |
| `3a3e47354c53` · 3.6 alt | F4 | viola → **fundo** | `alt="logo"` fixo no bundle 1.16.0; imagem 404 |
| `1cb2c878824b` · 1.2 semântica | F4 | não-mensurável → E-02 | 12 `<p><strong>` como subtítulo; listas conformes |
| `c2f94bdc17ce` · 4.2 só cor/tamanho | F4 | não-mensurável → E-02 | pseudo-títulos distintos só por peso |
| `2f22b7245ef9` semântica nativa | global | não-mensurável → E-02 | idem |
| `5d5a5f21d94b` · 3.3 title | F4 | não-mensurável → E-01 | `PNIP` |
| `75c11ccac582` · 3.4 localização | F4 | não-mensurável → E-04 | sem breadcrumb/aria-current/nav |
| `bfba9c1f5026` · 1.8 regiões | F4 | não-mensurável → E-03 | banner + main, sem contentinfo |
| `19f93475dc5e` Template Base | F2 | não-mensurável → E-03 | sem rodapé, skip link, breadcrumb |
| `e30aab6e9a68` anatomia | global | não-mensurável → E-05 | `has-menu` sem menu |
| `fb83eab75d8d` · 3.11, `20c08f26d8e8` · 3.12, `1db13803cbf8` · 3.2 | F4 | não-mensurável → E-07 | texto jurídico; siglas; palavras estrangeiras |
| `5717506ac2e6` ajuda | F2 | não-mensurável → E-09 | 0 links; a página isolada não responde |
| `79db88c7f55d` · 1.4, `cb56ad444da2` ordem | F4/global | conforme | Tab = 1 parada, sem tabindex positivo, DOM = ordem visual |
| `e6fd5e1247de` · 2.1, `f639993e9416` · 2.2, `41850b4791b8` teclado | F4/global | conforme | Enter ≡ clique, sem aprisionamento |
| `cd5de9a6f164` · 2.3, `d6e816588306` · 2.4 | F4 | conforme | sem meta http-equiv; URL estável |
| `8faca42c2c9a` · 2.6, `33b13d9fa271` · 2.7, `6ea7ecc60c01` · 5.5 | F4 | conforme | 0 animações |
| `698e0a4783a9` · 3.1 lang | F4 | conforme | `pt-br` |
| `cb09bc0c77c0` · 4.1 contraste | F4 | conforme | 111 elementos, mín. 12,63:1 |
| `21fbcc2fe37b` · 4.4 foco | F4 | conforme | outline dashed 4px #c2850c |
| `21b1a2733f7b` cores do DS | F3 | conforme | 3 cores, todas token |
| `406774b1cb87` Rawline | F3 | conforme | família declarada/computada (carga negada = fundo) |
| `a43ad8231ad0` ordem das dependências | global | conforme | fontes/ícones antes de `core.min.css` |
| `9826b6862644` script sem type | global | conforme | único `<script>` sem `type` |
| `9d9f1c9bf1ed` truncamento (prohibited) | F2 | conforme | nenhum texto recortado |
| `component-button-4d7b5f978df1` | F1 | conforme | variante circular, nome "Menu" |
| `accessibility-divider-30bbcbf3a17c` | F1 | conforme | tabIndex −1, ignorado na árvore |
| regras de `signin`, `avatar`, `list`, `item` | F1 | não-aplicável → E-06 | subárvore não renderizada |

**Escolhas de forma das unidades (§ 5).**
- **B-01** é defeito de ausência: ancora em `pnip-root`, o contêiner raiz da aplicação, onde o
  template autoral começa e onde o salto teria de ser o primeiro conteúdo; `scope: "unico"`. (`body`
  também é autoral, mas é o `index.html`; `pnip-root` é o hospedeiro que o autor controla nesta rota.)
- **B-02** ancora no **primeiro** `h3` (`privacidade h3:first-of-type`), `unico`: a medida mostra
  um salto de nível num ponto só (h1→h3); os h3 seguintes não saltam em relação ao anterior. Não é
  `todos` (cada h3 não carrega o salto) nem `composicao` (o defeito medido não é do conjunto).
- **B-03** ancora no próprio `<privacidade>`, `unico`.
- Nenhuma das três é expressável por uma das quatro espécies de `acceptance-predicates.ts` (ausência
  de elemento, sequência de títulos, classe de interface do elemento): ficam sem predicado e a medida
  mora em `conferir-auditoria.mjs` (precedente da tela A).

## 6. Observações `recommended` / `discouraged` / `permitted` e fundo

**Observações (nunca unidade):** botão Menu alcançável por Tab, mas Enter/Espaço/clique sem efeito
(`button-efd2d9e7c3c6`, `button-41d9f439e103`); `rawline.css` vem do CDN do DS e Raleway/Font Awesome
de CDNs de terceiros, core e web components locais (`0b73051d7063`); Raleway declarada como
alternativa (`c6889731433a`); `container-lg` com `.container` interno limitado a 800 px por estilo
inline (`9ef740ba1f28`); cabeçalho por web component, resto por CSS (`4a614a5c88e2`); sem Skip Link
no Template Base (`2387114907b1`, coerente com B-01); regras de sign-in/item na subárvore não
renderizada. Lista completa em `decisoes.json` (veredito `observação`).

**Fundo (`_meta.fundo`, não é unidade):**
1. Web component 1.16.0: botão Menu 32×32 px (< 48×48); `alt="logo"` fixo no template do logo
   (bundle congelado: `img {src: r.image, alt: "logo"}`); `@import` de Font Awesome 5.11.2 no shadow root.
2. Captura/isolamento: `govbr-logo.png` e `exit-icon.png` 404; Rawline, Raleway e Font Awesome 5.15.4
   negados — texto em fonte de fallback, ícone `fa-bars` sem glifo (caixa 24×0).

## 7. Lista escalada à autora

Cada item: medida + pergunta. A autora decide antes do congelamento; o que ela incluir entra na
referência com `origem: "autora"` na descrição.

| # | Normas | Medida | Pergunta |
|---|---|---|---|
| E-01 | `5d5a5f21d94b` · e-MAG 3.3 · WCAG 2.4.2 | `<title>PNIP</title>`, igual ao da tela de login; h1 = "Política de Privacidade do serviço Plataforma Nacional da Indústria do Pescado - PNIP" | Um título que só nomeia o sistema, sem o conteúdo da página, viola a 3.3? Se sim: unidade em `title`, `unico`. |
| E-02 | `1cb2c878824b` · 1.2; `3ac0aaa53900` · 1.3; `2f22b7245ef9`; `c2f94bdc17ce` · 4.2 | 12 `<p><strong>` abrem subseções (ex.: "Proprietário e Controlador de Dados", "Método de processamento", "Lugar"), distintos do corpo só pelo peso 700; os 16 `h3` envolvem o texto em `<strong>` | Os `<p><strong>` são títulos marcados como parágrafo? Se sim: 12 unidades (`todos`) ou 1 (`composicao`)? E o `<strong>` dentro de `h3` é uso de elemento por aparência (1.2)? |
| E-03 | `bfba9c1f5026` · 1.8; `19f93475dc5e` Template Base | marcos: banner + main; nenhum footer/`.br-footer`/contentinfo; nenhuma regra `required` da KB 3.7.0 exige rodapé textualmente (o Footer só tem `example`). **exposto** (D-54) | A ausência de rodapé viola 1.8 ou a regra do Template Base? Se sim: unidade de ausência em `pnip-root`. |
| E-04 | `75c11ccac582` · e-MAG 3.4 · WCAG 2.4.8 | sem breadcrumb, `aria-current` ou navegação; cabeçalho = nome do sistema, h1 = nome da página | O h1 basta como "mecanismo de orientação", ou a falta de breadcrumb viola a 3.4? |
| E-05 | `e30aab6e9a68` anatomia; (`e6fd5e1247de` · 2.1) | `<br-header has-menu>` autoral; o web component cria o botão Menu com `data-target="#main-navigation"`, alvo inexistente; clique e Enter sem efeito (3/3) | Botão que não faz nada é defeito autoral (o autor ligou `has-menu` sem menu) ou do DS (fundo)? Sob qual norma? |
| E-06 | `7e6420514860` · 1.1; `e038367bd7d6`; `3a3e47354c53` · 3.6; regras de avatar/sign-in/list/item | subárvore `.drop-menu-login` com `display:none` inline (sessão do Angular), nunca renderizada nesta captura: `button.br-item` com atributo `href` (inválido em `<button>`), `<p>` dentro de `<button>` (modelo de conteúdo), `img` sem `alt`, `role="menu"` sem nenhum `menuitem`, avatar sem conteúdo, `.br-sign-in` com `data-toggle="dropdown"` sem `core.min.js` | A validade de marcação vale para subárvore não renderizada (está no DOM deste estado), ou tudo aqui é estado dependente do Angular, fora do escopo (§ 2, § 6)? Se contar: quais viram unidade? |
| E-07 | `fb83eab75d8d` · 3.11; `20c08f26d8e8` · 3.12; `1db13803cbf8` · 3.2 | siglas sem expansão: RS, TI, IP, ONU (PNIP, LUMAC, LGPD, ANPD expandidas); palavras "marketing", "logs", "cookies", "E-mail" sem `lang`; texto jurídico de ~20 000 caracteres | Alguma dessas vira unidade (ex.: ONU/TI/IP sem expansão), ou fica fora como linguagem (§ 6)? |
| E-08 | `7e6420514860` · 1.1 (separação apresentação/conteúdo) | contêiner do conteúdo com `style="max-width: 800px;"` inline (o outro `style` inline, `display:none`, é binding do Angular) | Estilo inline autoral viola a separação de camadas da 1.1? |
| E-09 | `5717506ac2e6` ajuda | 0 links, nenhum menu funcional; a página isolada não responde se há ajuda em outra tela | Marcar `não-aplicável` (regra de produto)? |

## 8. Marcas `exposto` (§ 7 do método)

| Unidade / item | Exposição |
|---|---|
| **B-02** (salto de título) | **exposto** — README da ala real (axe `heading-order` em `h3:nth-child(6)`) e D-55 (axe 1 `heading-order`). |
| **B-01** (sem salto para o conteúdo) | **exposto** — o índice de memória do assistente cita o D-53 ("validator 2.7.0 page constraints header/footer/skip-link"); não está na lista do § 7 do método, declarado aqui. |
| B-03 (`<privacidade>`) | não exposto. |
| E-03 (rodapé) | **exposto** — D-54 ("o validator acusa rodapé ausente") e D-55 (`ds:page-footer`). |

Recall com e sem as exposições: sem as marcadas, a referência candidata tem **1** unidade (B-03).

## 9. Portão (partes do auditor) e recuo

| Passo | Resultado |
|---|---|
| `node tela-b/conferir-auditoria.mjs` | **43/43** (4 hashes, 3 de isolamento, 3 de estado, 5 medidas das 3 unidades, 16 medidas que cobrem as 20 linhas `conforme`, 10 dos controles `_meta.conformes`, 2 de cobertura) |
| `APP_URL=http://127.0.0.1:3217 npm run conferir:referencia -- --tela privacidade` | passa: 1 estado, 3 specs, 3 unidades, "sem predicado" nas três |
| `npm run test:isolation -- --tela fluxo` / `solicitacao` / `privacidade` | 52/52 · 52/52 · 53/53 |
| `npm run typecheck` | passa |
| re-medida do segundo agente | **pendente** (§ 10) |
| ratificação da autora | **pendente** |

**Recuo (§ 9 do método):** 3 unidades (< 8), todas em **1** família (F4; < 3), 7 controles conformes
(≥ 4). **A tela B, como auditada, é fina** em dois dos três critérios. Mesmo se a autora incluir
todos os itens escaláveis, as famílias com unidade só chegariam a F4 + F2 (E-03) + talvez F1 (E-06).
Pelo método, o próximo passo seria a mesma auditoria em `real/pnip-login.html`; **não foi iniciada**
(instrução recebida: parar e relatar).

**Desvios e notas.**
- Nenhum desvio do método. Escolhas registradas: `setup: []` e um estado; 3 unidades sem predicado.
- `_meta.conformes` virou `{ note, itens: [...] }` (cada item com `id`, `selector`, `count`, `rules`,
  `medida`) e `_meta.escaladas`/`_meta.auditoria`/`_meta.status` foram acrescentados; `check-reference`
  os aceita (campos documentais). Em `_meta.conformes`, seletor com `>>>` e vírgula tem de repetir o
  hospedeiro só uma vez (`br-header >>> .header-sign, .header-title`): `anchors.ts` divide o seletor
  inteiro em `>>>`.
- `check-reference.ts` abre a página sem abortar os CDN (não é código meu e não foi mudado): nessa
  conferência as fontes podem ter carregado. Não afeta as três unidades (DOM e ordem de títulos).
- `test:isolation` roda o validator por dentro (é o portão prescrito); só as linhas finais de contagem
  foram lidas, nenhum achado. Nenhum arquivo cego foi aberto; nenhuma ferramenta MCP do validator foi
  chamada; nada do axe/ESLint foi usado.
- `telas.json › privacidade.reference` apontou para `ground-truth-privacidade.json` só durante o
  portão acima. **Antes do commit o orquestrador voltou-o para `null`** (D-56): a referência é
  candidata, a tela é fina pelo § 9 e nada deve deixar a bateria da tela B passar do ponto único
  `referenciaDe()` antes da ratificação da autora. Para repetir o portão, apontar de novo localmente.

## 10. Re-medida independente (segundo agente)

_(vazio — a preencher pelo segundo agente, em contexto novo e sob as mesmas regras de cegueira, com
código próprio, a partir só das descrições das unidades e dos conformes.)_
