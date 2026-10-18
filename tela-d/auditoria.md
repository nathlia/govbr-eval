# Tela D (Processos do portal MPA) — auditoria por medição (passada 1)

> **Congelada como 1.0.0 em 2026-10-18 (D-135, NAT-92) — ver § 13.** As seções 0–12 são o registro da
> passada 1 (candidata, eval `288fd5d`) e não foram reescritas; o que mudou está na § 13.

**Método:** `tela-b/metodo-auditoria.md` (`5838702`) + adendo da B (`9406aed`) + adendo da D
`tela-d/metodo-auditoria-adendo-processos.md`, final e commitado sozinho antes desta auditoria
(`24a45fb`), **sha256 `d9989b5348ce18da9307fad7cec2eef67952c30f3640170ffb6d9749dda2b513`** (conferido
na árvore de trabalho). Fase 1 em `ec47f3f`; `govbr-corpus` `94b486d` (ala `pnip-d/` congelada).
**Executada em:** 2026-10-18, por agente LLM (Claude), em contexto novo, sem o oráculo, sob o D-48.
**Status:** referência **candidata** (`ground-truth-processos.json` `1.0.0-candidata`, sha256
`c3b710b2…9805d`), **acima do piso** (§ 11), com a F3 apoiada numa só spec (E-03). Faltam, nesta ordem
(adendo § F): re-medida do segundo agente, `npm run conferir:referencia -- --tela processos`, decisões
da autora (§ 8 / `recomendacoes-escaladas.md`). `telas.json › processos.reference` = `null`. Nada
commitado.

| Arquivo (`govbr-eval/`) | O que é |
|---|---|
| `tela-d/comum.mjs`, `sequencia.mjs`, `teste-estados.mjs`, `selecionar-estados.mjs`, `conferir-paradas.mjs`, `inventariar.mjs`, `estados.json`, `selecao.json` | fase 1 (inalterados) |
| `tela-d/inventario.json` | inventário **re-medido na árvore congelada** (§ 4) |
| `tela-d/montar-decisoes.mjs` → `decisoes.json` | tabela regra × veredito, 186 linhas |
| `tela-d/sortear-conformes.mjs` → `conformes.json` | controles conformes (sorteio com semente fixa) |
| `tela-d/conferir-auditoria.mjs` → `evidencia/*.json` | conferência sem modelo, N/N, e a evidência de cada spec/controle |
| `tela-d/recomendacoes-escaladas.md` | a lista para a autora, com recomendação |
| `ground-truth-processos.json` | referência candidata |

## 0. A tela nunca foi medida por agente — conferido pelos nomes

`processos|pnip-d|tela-d`, só nomes: `git -C govbr-eval log --all --name-only` → só `tela-d/` da fase
1 (`24a45fb`, `ec47f3f`) e `telas.json` (`ec47f3f`); `results/` e `pipeline/` até a 3ª profundidade:
nada; `govbr-ds-validator` (todo o histórico): nada; `govbr-corpus`: só a ala `public/pnip-d/`
(`94b486d`). Nada fora do esperado pelo adendo; nada escalado.

## 1. Objeto, condições e universo normativo

Árvore `govbr-corpus/{public,dist}/pnip-d/`: **190/190** arquivos do manifesto, nenhum fora; **sha256
de `pnip-d/manifesto.json`: `2e99f4109fc94ff3b31ca01c435eac0aa8603fb231a946b96257774668aa2032`**; lista
caminho⇥sha256 = **`d3b99cab…16857e`**, a mesma do candidato medido na fase 1 (o inventário e o teste
de estados da fase 1 valem). Condições: as de `tela-d/comum.mjs` (1280×900, Chromium do Playwright do
`govbr-eval`, headless, fuso `America/Sao_Paulo`, Node 25.2.1, toda saída abortada: **0** externos,
**0** escritas, **0** chamadas sem fixture em todas as medidas).

**Universo:** a base normalizada 3.7.0 de 186 regras + e-MAG 3.1 (igual à B e à C), lida da cópia
`ds-rules/06/govbr-ds-knowledge/versions/3.7.0/normalized/` (`rules.jsonl` sha256
`5cac5fee9a6871bed9283d8c9714a2480adb50225aaa0d304f0ec337b80a2c56`). Texto de norma lido: `rules.jsonl`
(inclusive `originalText`, `exceptions`, `expectedEvidence` das regras citadas), `tokens/colors.json`,
`examples/html/{tag,table}.json` (só os metadados estruturais: elementos interativos da Tag = `button`
e `input`+`label`; a Table traz `caption` e `label` nos checkboxes).

**Versões (§ 1):** cores computadas todas em `tokens/colors.json` 3.7.0; único valor que difere entre
versões: grid 24 px (core 3.4.1) × 40 px (KB) → E-08. **Separar autoral de DS:** só o bundle dos web
components congelado na árvore (`scripts.fc2a7d38df25b0e7.js`) foi aberto, para dois fatos: o
`br-tab` usa `aria-label = ariaLabel || id` no botão de cada aba (o nome das abas é o `id` que a página
passou), e o `br-button` encaminha `title` ao botão interno e tem as props `label`/`circle` (a página
não as passou nos botões de ícone). Nenhum chunk do app foi aberto.

## 2. Exposição prévia do auditor (marca `exposto`)

Lidos antes de julgar: o método da B (por referência nos adendos), o adendo da D inteiro e o da C
(§ B, citado pelo da D); **a auditoria da C como modelo** de formato e processo, a pedido do
orquestrador — `tela-c/auditoria.md`, `recomendacoes-escaladas.md`, `montar-decisoes.mjs` (com os
vereditos da C), `conferir-auditoria.mjs`, `sortear-conformes.mjs` e a estrutura + as specs de
`ground-truth-cadastrar-empresa.json`. **Desvio declarado:** o adendo § E diz "quem a leu não audita a
D"; a instrução do orquestrador autorizou ler a C como modelo. Efeito: o casco (D-11…D-14) é `exposto`
de qualquer jeito; fora do casco, a C julgou o mesmo `br-select-pnip` (E-05 aqui) e o mesmo "Exibir
lista" (D-09/E-03 aqui) — nos dois casos esta auditoria não reusou o veredito da C: seguiu a decisão da
autora no D-61 para o alvo de 32×32 e manda a E-05 à mesma decisão pendente da C. Também lidos: D-49,
D-57, D-59, D-60, D-61 e D-134 do registro de decisões; NAT-71 § 3; `telas.json › processos`.
**Não abertos:** `pnip-mock/src/`, `README-MOCK.md`, capturas, validator (código, base literal, dist),
axe, ESLint, Stylelint/comparadores, scorers, `govbr-resultados`, `results/`, `pipeline/logs/`, a
pasta `tela-d/` do rascunho compartilhado da sessão. A lista de specs de `ground-truth-vistorias.json`
não foi lida (só os precedentes do D-61 como estão no registro). Marca `exposto` (adendo § E, casco):
**D-11, D-12, D-13, D-14**.

## 3. Estados

Os da fase 1, sem mudança (`sequencia.mjs`): `inicial` (afterStep 0) e `lista-exibir` (afterStep 2:
clique em `br-select-pnip input#total` da paginação + espera de `.br-item`). Re-conferidos na carga
principal: path, mesmo documento, sem escrita/externo/sem-fixture, âncoras inalteradas entre as duas
paradas (fora `data-focus-visible-added`). A etiqueta "Meus processos" e os 6 filtros são clicáveis
mas o seletor de gatilhos congelado não os pegou (spans sem papel nem tabindex): não são paradas, e
entram só como aparecem nas paradas (D-03).

## 4. Inventário

`node tela-d/inventariar.mjs` (sem `--candidato`) na árvore congelada: `inicial` 618 elementos (215 em
shadow), 411 visíveis, 44 focáveis, um só título (h2), marcos main/banner/navigation×3, 1 tabela,
105 textos com contraste; `lista-exibir` 428 visíveis, 49 focáveis, 109 textos. O Tab (`ordemTab` da B)
chega ao teto de 200 paradas nas duas: depois do "Voltar" ele alterna iframe ↔ body (§ 5, D-10/E-01).
Diferença para a fase 1: só o carimbo e a identidade dos bytes (`congelado`, mesma lista).

## 5. Tabela de decisão — `node tela-d/montar-decisoes.mjs`

186 linhas: **viola 17 regras** (→ 14 specs, 60 unidades) · conforme 35 · não-mensurável 11 (→ § 8) ·
não-aplicável 49 · observação 31 · não normatiza 43. Nenhum filtro por `automatable`/
`automationConfidence`/`validationStrategy`.

| Spec | Estado | Âncora (escopo, n) | Regras | Fam. | Medida | Evidência (sha256) |
|---|---|---|---|---|---|---|
| D-01 | inicial | `… td:nth-of-type(9) br-button:nth-of-type(-n+2)` (todos, 18) | component-button-4d7b5f978df1 | F1 | "Ver processo" ×9 e "Desassociar…" ×9 (8 desabilitados): br-button sem `label`/`circle`, 72×40 raio de pílula, nenhum texto visível, nome só pelo `title` | `D-01.json` `d88f4e5c…0bac` |
| D-02 | inicial | `… td:nth-of-type(3) a` (todos, 9) | e6fd5e1247de · e-MAG 2.1 · f639993e9416 · 2.2 · 41850b4791b8 · 2f22b7245ef9 | F4 | `<a role=button>` sem href/tabindex: 0/9 no Tab real; o clique abre …/documentos (6 linhas), que o "Ver processo" não abre; linhas 1, 5, 8 → /login (mock) | `D-02.json` `e6ccce9f…0854` |
| D-03 | inicial | `.br-tag.interaction` (todos, 7) | e6fd5e1247de · 2.1 · f639993e9416 · 2.2 · 41850b4791b8 · 2f22b7245ef9 · e038367bd7d6 | F4 | `<span>` sem role/tabindex, generic sem nome, 0/7 no Tab; o clique filtra (9→10 linhas) ou abre opções | `D-03.json` `e48922e4…737a` |
| D-04 | inicial | `table input[type=checkbox]` (todos, 7) | b95c42b61ed3 · e-MAG 6.2 · b5fad7ce076d | F4 | labels 0, sem aria-label/labelledby/title, nome ""; 7/7 no Tab | `D-04.json` `58fd20c6…c609` |
| D-05 | inicial | `pnip-search-table-utils br-input >>> input` (único) | b95c42b61ed3 · 6.2 · b5fad7ce076d | F4 | br-input sem `label`; labels 0; nome = placeholder "Pesquise aqui ..." | `D-05.json` `4aa3391c…e7c6` |
| D-06 | inicial | status `div[class*=bg-]:not(.bg-indigo-vivid-60) > div` (todos, 8) | cb09bc0c77c0 · e-MAG 4.1 | F4 | branco sobre orange-vivid-40 3,16:1 (5), indigo-vivid-40 3,01:1 (1), secondary-06 3,54:1 (2) | `D-06.json` `e7390d97…01a3f` |
| D-07 | inicial | `pnip-mpa-processos table` (único) | cd705eb5da2a · e-MAG 3.9 | F4 | sem caption, aria-label/labelledby; nome "" | `D-07.json` `b0330f05…555f` |
| D-08 | inicial | `table thead th:last-child` (único) | 1ccbc61dddbc · e-MAG 3.10 | F4 | th da coluna de ações vazio, columnheader sem nome (precedente B-26) | `D-08.json` `138cf66a…42c9` |
| D-09 | inicial | `button.br-button:not(.circle)[aria-label]` (todos, 3) | foundation-global-1c0146e93d2e | F3 | "Buscar" e "Exibir lista" ×2: 32×32 (precedente B-28/B-29; E-03) | `D-09.json` `d09c40c9…4fac` |
| D-10 | inicial | `pnip-mpa-processos > iframe` (único) | 21fbcc2fe37b · e-MAG 4.4 · 7e6420514860 · e-MAG 1.1 | F4 | iframe about:blank vazio, 1160×500, sem title/name, Iframe sem nome; focado: outline none, sem sombra; depois dele Tab alterna iframe ↔ body | `D-10.json` `17516852…0ada` |
| D-11 | sempre | `pnip-root` (único) | 7d2b85f81c52 · e-MAG 1.5 | F4 | 0 âncoras `#`, 0 skiplink; 1º Tab = Menu — **exposto** | `D-11.json` `db45d7e4…6c8f` |
| D-12 | sempre | `pnip-root` (único) | 3ac0aaa53900 · e-MAG 1.3 | F4 | só h2, nenhum h1 — **exposto** | `D-12.json` `754fbd61…f42d` |
| D-13 | sempre | `head > title` (único) | 5d5a5f21d94b · e-MAG 3.3 | F4 | `<title>PNIP</title>` — **exposto** | `D-13.json` `4ebebb53…7806` |
| D-14 | sempre | inicial do avatar (único) | cb09bc0c77c0 · e-MAG 4.1 | F4 | 2,33:1 — **exposto** | `D-14.json` `2e87f08f…e6ad` |

Força de todas: `required`. Texto de norma (normalizedRule) por regra em `decisoes.json`; os sha256
completos em `_meta.evidencia`. Unidades: 60 (56 sem as expostas).

**Classes pré-registradas** (NAT-71 § 3; proposta do auditor — o protocolo § 5.3 pede ainda dois
classificadores cegos e a autora nos desacordos): sintático D-01, D-02, D-03, D-08 (b); contextual/
relacional D-04, D-05, D-07, D-11, D-12 (b); layout/visual D-06, D-09, D-10, D-14 (b); semântico D-13
(c). Sem as expostas: sintático 4 · contextual 3 · layout 3. O nível a não é verificável pelo auditor
cego. Detalhe e motivo em `_meta.classes`.

**Escolhas de forma.** `todos` onde cada elemento carrega o defeito (D-33). D-01 conta os 8
"Desassociar" desabilitados (E-06). D-11/D-12 ancoram em `pnip-root` (ausência global), para não pôr
spec exposta sobre o h2 que é controle conforme (K-03). D-06 exclui pela classe de fundo o único status
que passa (controle K-08). Nenhum predicado `acceptance`: a medida mora em `conferir-auditoria.mjs`.

## 6. Observações e registro sem norma

`recommended`/`discouraged`/`permitted` (nunca unidade): "Exibir lista" fora do Tab (`tabindex=-1`,
padrão do Select); Enter ≡ clique nos botões testados; rádios da lista sem `name`; coluna de seleção
com células vazias nas linhas 1, 5 e 8 (dado do mock); nenhum CDN; Raleway como alternativa; sem Skip
Link (D-11). **Sem norma no universo** (descoberta se alegado): nome acessível das abas = `id`
("HISTORICO" para a aba visível "Concluídos"; a página não passa `aria-label`, o web component cai no
id — WCAG 2.5.3 não está no e-MAG 3.1); data exata de "Aberto há" só no `title` da célula; lupa no
seletor de itens por página; duas regiões `navigation` para uma paginação; `th` da coluna de seleção
sem texto nem `scope`.

## 7. Fundo (`_meta.fundo`)

DS 3.4.1/1.16.0: `aria-label` das abas = id (recurso do web component; a escolha do id é autoral);
`alt="logo"` do `<br-header>`; `aria-label=""` no botão interno de todo br-button e no Home do
breadcrumb; item atual do breadcrumb sem `aria-current`; "Home" `sr-only`; Menu/Home 32×32; aba ativa
sem `aria-selected`; a lista do seletor focada não mostra foco (`.br-select .br-list:focus{outline:none}`
do core — conferido); grid 24 px. Mock: link do breadcrumb sem `/pnip-d/` (recarga); números de
processo das linhas 1, 5 e 8 → `/login`; conteúdo da lista, status e opções dos filtros; "Aberto há"
pelo relógio congelado.

## 8. Lista escalada à autora

Em `tela-d/recomendacoes-escaladas.md`, com medida, pergunta e recomendação por item (E-01…E-08).
Resumo: **fora** E-01 ⚠, E-02 ⚠, E-04, E-05 (mesma decisão da C), E-08; **manter** D-09 (E-03; recusar
derruba a F3 e o piso) e os desabilitados na D-01 (E-06 ⚠); **precedente do D-61** em E-07.

## 9. Controles conformes — `node tela-d/sortear-conformes.mjs`

Regra da C + exclusões declaradas no script antes do sorteio (casco; linhas de página inteira; pares
de significado; elementos que são âncora de unidade ou objeto de escalada pendente). 14 pares elegíveis
→ **12 sorteados** (semente "tela-d/conformes 2026-10-18 (gravada antes do sorteio)", mulberry32;
camada 1 = um por tipo): K-01 link Home no Tab; K-02 `li` do breadcrumb (1.7); K-03 h2 6,72:1; K-04
foco do "Exportar"; K-05 abas por teclado; K-06 7 títulos de coluna ≥ 5,9:1; K-07 "Assinar" com texto
visível (vizinho da D-01); K-08 status "Em revisão analista" 6,49:1 (vizinho da D-06); K-09 divisor fora
do foco/árvore; K-10 rádios rotulados; K-11 item: superfície inteira + hover; K-12 item: padding 16 px.
Fora do sorteio: `breadcrumb-orientacao`, `botoes-rotulo`. **sha256 `tela-d/conformes.json`:
`6bef1c8d9be18e819422a78750d38244d9fdb0b93d08cb1a71eea2b4cb5e90c2`**. Todos os 14 elegíveis são
re-medidos na conferência.

## 10. Fora do escopo

O do `_meta.fora_de_escopo`: abas que trocam a lista, "Meus processos" e filtros aplicados, troca de
página, "Exportar", "Ver processo", números de processo, breadcrumb e "Voltar" (navegam), os dois
SweetAlert2, menu do avatar, listas abertas dos filtros; outras janelas/zoom, linguagem, fixtures,
regras só da base literal.

## 11. Portão (partes do auditor) e piso

| Passo | Resultado |
|---|---|
| `node tela-d/conferir-auditoria.mjs` | **126/126** (bytes e lista da fase 1; referência × sequência; sha256 dos conformes; por parada path, documento, escrita/externo/sem fixture e contagem de cada âncora; segmento inalterado; as 14 specs; os 14 pares conformes; linhas conformes de `decisoes.json`; Tab real, cliques e destinos em cargas auxiliares; as 26 evidências reproduzem o sha256 registrado). **Rodado 3×**, 126/126 nas três, e o sha256 do conjunto `evidencia/*.json` idêntico (`bd0d095f…4e43`). |
| re-medida do 2º agente, `conferir:referencia`, decisões da autora | **pendentes** (adendo § F, nesta ordem) |

**Piso (adendo § A), sem `exposto`:** specs **10** (≥ 8 ✓) · famílias **3** — F1 (D-01), F3 (D-09), F4
(D-02…D-08, D-10) (✓) · tipos do DS **5** — button, tag, table, input, select (✓) · conformes **12** (✓).
**Frágil:** a F3 é só a D-09, que existe pelo precedente do D-61; se a autora recusar a E-03, a tela
fica com 2 famílias, abaixo do piso. Nenhuma F2 foi achada (sem estado vazio, truncamento ou tela de
erro; Template Base e grid são casco/versão). Nenhuma unidade foi criada para alcançar o piso.

## 12. Desvios e notas

1. Universo lido de `ds-rules/06` (mesmos 186 ids da B e da C), não do caminho do validator (§ 1).
2. A auditoria da C foi lida como modelo, contra a letra do adendo § E (§ 2).
3. Sondas exploratórias (no rascunho da sessão, fora do repositório) mediram fatos antes da tabela;
   tudo que sustenta veredito foi re-medido por `conferir-auditoria.mjs`. A referência foi gerada por
   um script de rascunho a partir das specs escritas à mão e de `conformes.json`; o JSON é o artefato.
4. **Tab real com espera da lista.** Sair do campo de pesquisa refaz a consulta (E-04); com 200 ms por
   tecla, o Tab que cai no instante sem linhas pula a tabela inteira. A conferência espera 300 ms e a
   lista presente depois de cada tecla; o `ordemTab` da B (só 300 ms), usado no inventário, chegou à
   tabela nas medidas feitas, mas depende do relógio.
5. `tela-d/inventario.json` foi regravado pela re-medida na árvore congelada (§ 4).
6. Nada commitado (instrução do orquestrador). Na árvore de trabalho há mudanças que não são desta
   auditoria (`runner/images.lock.json`, `portao-nat86/medicoes/…`): não foram tocadas.

## 13. Decisões da autora e congelamento (D-135, 2026-10-18)

**Re-medida independente:** eval `87c13de` (`tela-d/remedida/`, código próprio): 14/14 specs, 60/60
unidades, 12/12 controles, **0 divergências**, 2 execuções idênticas.

**Decisões (NAT-92, D-135):** **E-03 fora** → a **D-09 sai**: a revisão do Codex
(`testing/nat92-target-css-review.json`) mostrou que os três alvos de 32×32 ("Buscar", "Exibir lista"
×2) recebem tamanho e raio da regra `.br-input .br-button` do core 3.4.1 — estilo do DS, que o adendo
exclui (fundo). E-01, E-02, E-04, E-05 e E-08 **fora**; E-06 **mantém** (D-01 com 18 unidades); E-07
aplica os precedentes do D-61. Registro por item em `ground-truth-processos.json › _meta.escaladas`;
`decisoes.json` regenerado (a linha foundation-global-1c0146e93d2e deixa de ser `viola` e cita
E-02/E-03: viola 16 · não-mensurável 12); `evidencia/D-09.json` removido.

**Referência 1.0.0:** **13 specs / 57 unidades**; sem as expostas **9 specs / 53 unidades**, famílias
**F1** (D-01) e **F4** (D-02…D-08, D-10), 4 tipos do DS (button, tag, table, input), 12 conformes.
Classes: sintático 4 · contextual/relacional 5 · layout/visual 3 · semântico 1 (sem as expostas:
sintático 4 · contextual 3 · layout 2).

**Desvio do piso (declarado):** o piso pré-registrado pedia ≥ 3 famílias; a D tem 2. A autora aceitou
2 famílias para a tela D (D-135), **antes de qualquer execução de agente na tela** — não pode favorecer
braço nenhum. Entra como limite de validade externa no texto. Gravado em `_meta.piso`.

**Portões:** `node tela-d/conferir-auditoria.mjs` **124/124**, 3×, sha256 do conjunto
`evidencia/*.json` idêntico nas três (as 25 evidências restantes são byte a byte as da candidata);
`APP_URL=http://127.0.0.1:3218 npm run conferir:referencia -- --tela processos` (servidor
`node tela-d/servir.mjs`, árvore congelada conferida contra o manifesto) **passa: 13/13 specs, 57
unidades, estados e contagens sustentam**. `telas.json › processos.reference` =
`ground-truth-processos.json`. Nenhum detector rodou na tela antes deste congelamento.
