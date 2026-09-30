# Tela B — método da auditoria por medição (2026-09-30)

**Status:** método escrito, auditoria **não** iniciada. Nada da página foi julgado ainda; este arquivo
é o que o plano da fatia 8 exige antes: "o método e o escopo da auditoria são escritos e commitados
primeiro" (`thesis-workspace/deliverables/fatia8-telas-intocadas-plano.md`, tela B; D-49, D-55).
O commit que congela este arquivo é registrado no início de `tela-b/auditoria.md`; qualquer desvio
posterior é escrito lá, com o motivo, e nunca reescrito aqui.

## 0. A tela nunca foi medida por agente — conferido pelos nomes de arquivo

Conferido em 2026-09-30, só por **nomes** de arquivo e de pasta, sem abrir conteúdo de resultado:

- `git -C govbr-eval log --all --name-only` com `privacidade|pnip`: um único arquivo,
  `results/baselines-privacidade.json` (a linha de base avulsa do D-55, entrou no commit `0a369af`).
  Não é execução de agente; não foi aberta e não é aberta pela auditoria.
- `results/`: não existem `runs-privacidade*` nem `semantic-review-privacidade`; nenhuma entrada até
  a 3ª profundidade de `runs*`, `semantic-review*`, `surface-checks` e `pipeline/` tem `real`, `pnip`
  ou `priv` no nome.
- `govbr-ds-validator` (todo o histórico): nenhum arquivo com `privacidade|pnip` no nome.
  `govbr-corpus`: só as duas capturas congeladas (`7eb3487`).

Limite: execuções antigas da suíte `TC-*` guardam arquivos cujo nome não diz a rota; a conferência
por nome não os cobre. Nenhuma delas tinha a ala real como alvo declarado (D-13).

## 1. Objeto

| Arquivo (`govbr-corpus/public/real/`, cópia idêntica em `dist/real/`) | sha256 |
|---|---|
| `pnip-privacidade.html` (= `manifesto.json`) | `83d8e1973235dd08d2d14417c4764f78a566209c228a8af51211873a258f71a7` |
| `manifesto.json` | `d03efe953d7bcc4fbf23e0270eaeee3af0e2f824a3f196bc155d3658c4f60227` |
| `assets/core.min.css` (`@govbr-ds/core` 3.4.1) | `cf176bd46bb3f8032991ef5c79ffe05997cd72d21951f287a6270fd05ed266aa` |
| `assets/webcomponents.umd.min.js` (`@govbr-ds/webcomponents` 1.16.0) | `c196dbc1a8f5af079bb4c8c50bedb883872b2fa3f0e86d3451182072b77ae478` |

O manifesto só tem hash do HTML; os dois ativos entram aqui porque o que a página renderiza depende
deles. `conferir-auditoria.mjs` recusa medir se qualquer um dos quatro divergir.

**Condições de medida = as da bateria.** Página servida do `dist/` do corpus (servidor próprio do
script, como em `tela-a/conferir-construcao.mjs`, ou o :3000 com `APP_URL`); Chromium do Playwright
1.61.1 do `govbr-eval`; janela **1280×900**; Node 25.2.1 (`.node-version`, via `use-node`, nunca
`nvm use`). Os três hosts de `telas.json › privacidade.isolamento.externos` são **abortados** por
`page.route`, como a política de saída da bateria os nega; os dois `ausentes` respondem 404. Medir
com CDN liberado mediria outra página. Outras janelas (320 px, zoom 200 %) ficam fora (§ 6).

**Versões.** A página usa core 3.4.1; a base normativa descreve 3.7.0, e é a 3.7.0 que os dois braços
recebem como norma. Tratamento, por regra:

1. Regra independente de versão (semântica HTML, ARIA, e-MAG, contraste, ordem de foco): aplica-se.
2. Regra de DS cuja prescrição o próprio pacote 3.4.1 da página já materializa (classe, token como
   custom property, anatomia presente em `core.min.css` ou no bundle 1.16.0): aplica-se. A prova é
   um fato medido nos ativos congelados, citado na decisão.
3. Regra que depende de recurso que não se consegue mostrar existente no 3.4.1: `não-aplicável
   (versão)`, com o motivo. Nunca vira unidade.
4. Valor de token que difere **só** entre as versões (o 3.4.1 declara X, a KB 3.7.0 diz Y): não é
   unidade; vai para a lista de escaladas (§ 4).

## 2. Estados

A pergunta aberta do D-55 é empírica e é respondida por teste, antes do inventário.

**O teste de estados** (script próprio, registrado em `auditoria.md` com a saída):

1. Carregar a página nas condições do § 1 e esperar a hidratação: `customElements.whenDefined` de
   cada `br-*` customizado presente e shadow root do `<br-header>` não vazio. O seletor usado vira o
   `_meta.waitFor` da referência.
2. **Gatilhos candidatos**, enumerados mecanicamente no light DOM e em toda shadow root aberta:
   `button`, `a[href]`, `[role=button|menuitem|tab]`, `[aria-expanded]`, `[aria-haspopup]`,
   `[aria-controls]`, `[data-toggle]`, `[tabindex]`, e os hospedeiros `.br-sign-in` / `.br-avatar`.
3. Para cada gatilho, em carga nova: fotografar (a) o DOM serializado com shadow roots, (b) a árvore
   de acessibilidade do Chromium (CDP `Accessibility.getFullAXTree`), (c) a URL; acionar por
   **clique real** do Playwright; fotografar de novo. Repetir com `Enter` sobre o gatilho focado.
4. Um gatilho **produz estado** se, e só se: a árvore muda de forma observável (elemento passa a
   visível — caixa não nula e `visibility`/`display` computados —, ou `aria-expanded` vira), a URL
   não muda, nenhum pedido sai para host externo, o efeito se repete em **3 de 3** cargas novas, e a
   mudança é **aditiva** (nenhum elemento presente no primeiro paint some) — a exigência que
   `check-reference` cobra de `_meta.setup`.
5. Resultado possível: (a) nenhum gatilho produz estado → tela de **um estado** (`inicial`,
   `afterStep: 0`, `setup` vazio); (b) algum produz → cada um é estado declarado em `_meta.states`,
   alcançado por `setup` (`click` + `wait`), e o conteúdo que ele expõe é auditado **naquele** estado
   pelo mesmo procedimento; (c) efeito que não se repete 3/3 ou que não é aditivo → não é estado;
   fica registrado e escalado.

Isto não contradiz "cada estado é uma captura própria, nunca uma simulação posterior" (manifesto):
o clique real sobre a página congelada, executado pelo código do DS que a própria captura trouxe, é o
mesmo gesto que o agente pode fazer na bateria — não há injeção de DOM nem roteiro que finja o
Angular. O que **dependeria** do Angular (navegar, entrar, sair, submeter) não é estado desta página;
exigiria nova captura, com arquivo e hash novos (README da ala real), e fica fora deste passo.

## 3. Inventário e normas aplicáveis

**3.1 Inventário de elementos** (fato de DOM, gravado em `auditoria.md`): todo elemento do light DOM
e das shadow roots abertas, com tag, classes `br-*`, papel e nome acessíveis, caixa em 1280×900,
focabilidade e ordem de `Tab`. Daí sai a **lista de componentes presentes** (por classe `br-*`, tag
customizada ou anatomia equivalente) e a lista de **estruturas de página** (título, `lang`, regiões,
cabeçalhos, listas, links, imagens, rodapé, salto).

**3.2 Universo normativo, enumerado mecanicamente — só texto de norma.** Fontes permitidas:
`govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/` (`rules.jsonl`, `components/`,
`page-rules/`, `templates/`, `tokens/`, `development/`, `accessibility/`, incluindo o e-MAG 3.1 em
`accessibility/emag.json`). Para cada uma das 186 regras e cada recomendação do e-MAG, uma linha na
tabela de decisão:

- **Entra** regra com `force` ∈ {`required`, `prohibited`} cujo `component` está no inventário ou é
  global (`-`), e toda recomendação do e-MAG. `recommended`/`discouraged` viram **observação** em
  `auditoria.md`, nunca unidade; `informative` e `example` nunca normatizam (D-10, D-32).
- **Não se filtra** por `automatable`, `automationConfidence` nem `validationStrategy`: são juízos
  feitos ao montar a base para o oráculo, e filtrar por eles selecionaria o que se esperava que ele
  automatizasse (mesmo afastamento do D-50).
- Famílias em escopo: (F1) regras de componente do DS para os componentes presentes; (F2) Template
  Base e regras de página (`templates/base.json`, `page-rules/page-structure.json`,
  `navigation-patterns.json`, `content-overflow.json`, `grid.json`); (F3) fundamentos — tokens de
  cor, tipografia e espaçamento; (F4) e-MAG. WCAG 2.2 entra só como alias de regra da KB ou do e-MAG
  que já é unidade, nunca sozinha.

**3.3 Decisão por (elemento × norma)**, um de quatro vereditos, cada um com a medida e o trecho de
norma citado (id + `normalizedRule`/texto do e-MAG):

| Veredito | Quando | Destino |
|---|---|---|
| `conforme` | a medida mostra o que a norma exige | inventário; candidato a controle conforme (§ 5) |
| `viola` | a medida mostra o contrário, sem juízo | unidade da referência |
| `não-aplicável` | condição da regra ausente, componente ausente ou versão (§ 1) | só registro |
| `não-mensurável` | exige juízo, percepção ou algo fora do que a página congelada responde | lista de escaladas |

## 4. Padrão de evidência

Uma unidade só existe se repousar em **medida determinística e reprodutível** na página congelada,
mais a citação do texto da norma. Espécies de medida admitidas:

- fato de DOM (presença/ausência de elemento ou atributo, hierarquia, contagem, ordem de cabeçalhos);
- estilo computado (`getComputedStyle`), inclusive nos estados de foco alcançados por teclado;
- razão de contraste calculada pela fórmula da WCAG a partir das cores **computadas** do texto e do
  primeiro fundo opaco da cadeia de ancestrais; fundo com imagem, gradiente ou transparência não
  resolvida → `não-mensurável`;
- ordem de foco observada com `Tab` real no Playwright, lendo `document.activeElement` através das
  shadow roots;
- nome, papel e estado acessíveis lidos da árvore de acessibilidade do Chromium.

Código próprio, escrito para a auditoria. **Proibido** na auditoria e no script: o
`govbr-ds-validator` (ferramentas MCP, `src/`, `dist/`), axe-core/`@axe-core/playwright`, ESLint,
`checker-aliases.json`, `kb-aliases.json`, `tela-a/has-checker.json`, `results/`, `reports/`,
`pipeline/logs/`. Os arquivos do validator fora de `data/knowledge/` também ficam fechados
(`data/*.json` que o oráculo serve podem carregar escolhas de verificador). Pode-se ler: a página, os
ativos congelados, o texto de norma do § 3.2 e a documentação do próprio `govbr-eval`.

**Juízo de modelo sozinho nunca faz unidade.** Veredito que dependa de interpretação — clareza de
texto, adequação de rótulo, "hierarquia visual", intenção do conteúdo, token por versão (§ 1) — vai
para a lista **escalada à autora**, com a medida que houver e a pergunta exata. A autora decide cada
item antes do congelamento; o que ela incluir entra marcado `origem: "autora"` na descrição da spec.

## 5. Forma da unidade

A mesma da tela de fluxo e da tela A (`types.ts › FlowViolationSpec`): **(elemento × defeito), no
estado aplicável.** Por unidade: `id` `B-01…`; `anchor` (seletor que `anchors.ts` resolve — ele desce
por toda shadow root aberta, então seletor genérico pode casar dentro de componente do DS; usar
`host >>> interno` ou seletor específico e conferir `expectedCount`); `scope` `unico`/`todos`/
`composicao` com o critério do D-33 (defeito do conjunto → `composicao`; cada elemento o carrega →
`todos`); `state`/`conditional` (§ 2); `rules` = ids da KB (`govbr-3.7.0-…`), `emag:X.Y`,
`wcag:X.Y.Z` — **nunca** aliases `ds:*`, que são vocabulário do oráculo; `categories`; `description`
com a medida; `acceptance` quando uma das quatro espécies de `acceptance-predicates.ts` a exprime
(`estilo-computado`, `atributos-ausentes`, `classe-no-elemento`, `cor-de-borda-pintada`) —
quando nenhuma exprime, a spec fica sem predicado e a medida mora em `conferir-auditoria.mjs`
(precedente da tela A).

**Defeito de ausência** (elemento de página que falta) ancora no hospedeiro onde a norma o exige
(ex.: o contêiner raiz da aplicação), `scope: "unico"`; a escolha é justificada em `auditoria.md`.

**Controles conformes.** O esquema não os pontua; ficam em `_meta.conformes` (documental, como os
`chamarizes` da tela A, que nenhum script do instrumento consome): `{ selector, rules, medida }` por
item, **só** para (elemento × norma) medidos `conforme` sobre normas que também têm unidade `viola`
na tela, ou sobre componentes do inventário — para que um alarme falso tenha onde aparecer. Não entram
em denominador; alegação sobre eles é adjudicada como qualquer outra fora da referência (D-48).

**Fundo.** Condições que o autor da página não escreveu vão em `_meta.fundo`, não viram unidade:
defeito localizado só no código do DS (shadow root dos web components 1.16.0, regra padrão do
`core.min.css` 3.4.1 — mesmo critério da tela A, `tela-a/construcao.md` § Condições de fundo) e
perda da captura/isolamento (os dois ativos 404, fontes Rawline/Raleway e ícones Font Awesome
negados). Alegação correta sobre fundo entra como descoberta.

## 6. Fora do escopo — e a incompletude declarada

Não coberto: outras janelas e zoom; estados que dependem do Angular e outras rotas; qualidade de
redação, linguagem simples e microcopy (`writing-principles`, `microcopy`), exceto o que a autora
decidir pela lista escalada; saída real de leitor de tela além da árvore de acessibilidade; defeitos
do DS e da captura (§ 5, fundo); regras 3.7.0 sem correspondente no 3.4.1 (§ 1).

**A referência é incompleta por natureza.** Na tela B, recall é **"contra a referência auditada"**,
e o texto de resultados usa essa expressão. Alegações corretas fora da referência são esperadas em
maior número do que nas telas construídas: são adjudicadas pelo D-48, relatadas como
**descobertas** e **não mudam o denominador** desta bateria. Números da tela B nunca se somam, se
promediam nem formam série com os do fluxo nem com os da tela A (D-13, D-49). A linha de base de
bateria é medida sob o carimbo da bateria (D-06); a auditoria não a roda nem a antecipa.

## 7. Viés do auditor — declaração

A auditoria é executada por assistente LLM (Claude), sem o oráculo, sob o D-48, e **ratificada pela
autora antes de qualquer bateria**. Riscos declarados:

1. **Mesma família de modelo que os dois braços.** O auditor tende a achar o que o agente acharia e a
   não ver o que o agente não vê: a referência pode favorecer o recall dos dois braços por igual e
   esconder pontos cegos comuns.
2. **Exposição prévia, que não se desfaz.** Quem lê o registro de decisões e o corpus já viu: D-54
   ("o validator acusa rodapé ausente; cabeçalho `<br-header>` presente; nenhum link"), D-55 (linha
   de base avulsa: validator 1 achado `ds:page-footer`, axe 1 `heading-order`) e o README da ala real
   (axe `heading-order` em `h3:nth-child(6)`; "estrutura 2, 4 elementos"). O método escrito por
   assistente também os viu.

Mitigações: (a) só entram unidades de medida (§ 4) — o procedimento chega a cada (elemento × norma)
pela enumeração do § 3, não por lembrança; (b) toda unidade cujo par (elemento, norma) coincide com
uma exposição acima leva a marca `exposto` em `auditoria.md`, e o relatório da bateria dá o recall com
e sem essas unidades; (c) `conferir-auditoria.mjs` re-mede tudo sem modelo; (d) um **segundo agente**,
em contexto novo e sob as mesmas regras de cegueira, recebe só as descrições das unidades e dos
conformes e **re-mede com código próprio** (não o script do auditor); divergência → escalada. Uma
segunda enumeração independente, para estimar a completude, fica como opção da autora; se feita, é
antes do congelamento e suas unidades seguem o mesmo padrão de evidência.

## 8. Entregáveis e portão de aceitação

1. `govbr-eval/tela-b/auditoria.md` — commit do método, hashes medidos, saída do teste de estados,
   inventário, tabela de decisão por norma (§ 3), observações `recommended`, fundo, lista escalada
   com as decisões da autora, marcas `exposto`, relatório do segundo agente.
2. `govbr-eval/tela-b/conferir-auditoria.mjs` — sem modelo e sem oráculo; confere os quatro hashes,
   serve o `dist/`, aborta os externos, alcança cada estado declarado e re-mede **cada unidade**
   (`viola`) e **cada conforme** (`conforme`), imprimindo `N/N`. Não importa nada do validator nem do
   axe.
3. `govbr-eval/ground-truth-privacidade.json` 1.0.0 — `_meta` com `url: "/real/pnip-privacidade.html"`,
   `waitFor`, `viewport` 1280×900, `states` (e `setup` se houver), `conformes`, `fundo`,
   `nunca_agregar_com`, `baselines` ("medidas sob o carimbo de cada bateria", D-06), e `version_note`
   dizendo que é referência auditada e incompleta, congelada antes de qualquer execução.
4. `telas.json › privacidade.reference` passa a apontar para o arquivo (e `isolamento.interacao`,
   se o § 2 declarar estado).

**Portão**, nesta ordem: `node tela-b/conferir-auditoria.mjs` N/N; re-medida do segundo agente sem
divergência aberta; `npm run conferir:referencia -- --tela privacidade` passa; `npm run
test:isolation -- --tela X` passa para `fluxo`, `solicitacao` e `privacidade`; ratificação da autora
registrada no log. Só então a referência congela, e anotações posteriores (aliases do scorer, quais
regras o oráculo verifica) não mexem em unidade — lacuna de alias se corrige na tabela de alias,
nunca na referência.

## 9. Recuo para `real/pnip-login.html`

A tela B é **fina** se a referência auditada, antes do congelamento, tiver **menos de 8 unidades**,
ou unidades em **menos de 3 das 4 famílias** do § 3.2, ou **menos de 4 controles conformes**. Com 3
execuções por braço, abaixo de 8 unidades cada unidade vale mais de 12 pp de recall, e o sinal fica
indistinguível da variação entre execuções.

Se fina: a mesma auditoria, por este mesmo método (hashes e conferência de nomes refeitos para o
login), é feita em `real/pnip-login.html`, que também é intocada. Fica a tela que passar do limite;
a auditoria da privacidade permanece registrada. Se nenhuma passar, **não há bateria automática**: a
autora decide entre rodar a tela fina declarando a baixa resolução ou encerrar a tela B. As duas
nunca se somam (D-13).
