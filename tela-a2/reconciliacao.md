# Tela A2 — reconciliação sorteio × construção × auditoria cega (2026-11-02)

**Status:** proposta. Nada foi aplicado à página, ao sorteio, ao registro de construção nem à auditoria;
a referência existe só como rascunho em `tela-a2/candidata/ground-truth-acompanhamento.json`
(`1.0.0-candidata`). O que precisa da autora está em `recomendacoes-escaladas.md` (E-01…E-09). Dados
completos, com o sha256 de cada entrada, em `reconciliacao.json`.

**Como foi feito.** Cada unidade sorteada (`sorteio-2.json`) foi casada com os 34 achados de
`auditoria/achados.json` por **elemento × estado × regra**. As normas do auditor são ids da base literal
`3.7.0-literal-2026-10-15` (a que ele leu); a correspondência com o universo da A2 (`a2-*`) foi feita
pelo texto da frase (`universo.json`/`elegibilidade.json`). Para atribuir a causa dos achados não
planejados foram lidos o `core.min.js`/`core.min.css` e os exemplos oficiais do pacote
`@govbr-ds/core` 3.7.0. Nenhuma ferramenta do `govbr-ds-validator`, nenhum axe, nenhuma medida nova.

- `detectada`: mesma norma do sorteio (principal ou em `tambemViola`).
- `detectada-com-outra-norma`: mesmo elemento e estado, outra norma para o mesmo observável.
- `nao-detectada`: nenhum achado no elemento (o porquê vem junto).

## 1. Unidades sorteadas (14 specs, 16 unidades)

| Spec | Regra · variante (estrato) | Onde | Estado | Resultado | Achado · porquê |
|---|---|---|---|---|---|
| U-01 | a2-10aee59f9c1b rotulo-aba-pequeno (DS) | `#tab-requerimento .tab-item button` | sempre | **não detectada** | A tabela de Tipografia da Tab não existe na base literal (nenhuma linha no universo do auditor); 14 px está na escala Minor Third, então a regra do A2-31 não a pega. Medida só da construção (14 px × 20,16 px). |
| U-02 | a2-caf6bc80cb4b borda-sem-feedback (DS) | `#upl-documento .upload-button` | S1 + arrasto | **não detectada** | A frase "a borda muda para verde" não existe na base; o auditor não simulou arrasto (incerto). **Coincide com o core 3.7.0.** |
| U-03 | a2-329f74d7646c titulo-fora-da-tabela (DS) | `#titulo-duvidas` | sempre | detectada com outra norma | **A2-31**: escala Minor Third (`foundation-global-21fb08664799` = a2-2f4eadc23b2c, elegível). A frase sorteada está na base só como *recommended* (`7b7256828c9c`), fora do filtro do auditor. |
| U-04 | a2-52ea5c58a080 sem-indicador (DS) | `#stp-andamento .etapa-decisao` | S0 | detectada | **A2-23**, mesma regra. |
| U-05 | a2-5f85eeafe863 icone-descentralizado (DS) | `#msg-pendencia .fechar-mensagem` | sempre | **não detectada** | A frase do Button › Densidade ("ícone… sempre centralizados") não existe na base. Medida só da construção (desvio 8 px). |
| U-06 | a2-e99c92f13ac0 texto-alternativo-visivel (DS) | `#tip-protocolo-gatilho .rotulo-botao` | sempre | detectada com outra norma | **A2-12** (WCAG 2.5.3), **A2-13** (`component-button-81f5e26ec0ef` = a2-6d5f38f9bab8). Frase sorteada só *recommended* na base (`afb62719493b`). |
| U-06′ | idem, cópia compartilhada | `#tip-prazo-gatilho .rotulo-botao` | sempre | detectada com outra norma | **A2-14**, **A2-15**. |
| U-07 | a2-e9ded28efe9c aria-checked-fixo (DS) | `#aviso-email` | S1 | detectada | **A2-27**, mesma regra. **Coincide com o core.** |
| U-07′ | idem, cópia compartilhada | `#aviso-sms` | S1 | detectada | **A2-28**. |
| U-08 | a2-971db6a57c75 item-expandido-sem-estado (G) | `#acc-duvidas button.header` | S0 | detectada | **A2-22**, mesma regra (guia WAI-ARIA). **Coincide com o core.** |
| U-09 | a2-d720ea8520cb erro-so-borda (G) | `#tipo-documento` | S2 | detectada | **A2-30**, e-MAG 6.6. |
| U-10 | a2-22240b8959ba recarga-periodica (G) | `meta[http-equiv=refresh]` | sempre | detectada | **A2-01** (2.3 em `tambemViola`; principal citada 2.4) e **A2-02** (2.5, fora do protocolo; E-05). |
| U-11 | a2-d45711a55b6c fechar-div (G) | `#msg-retorno div.br-button[role=button]` | S2 | **não detectada** | A norma (e-MAG 1.2, `7c91abad32ce`) estava no universo do auditor e foi aplicada só ao skiplink (A2-06); no Fechar ele conferiu classe, nome e teclado, não o tagName. Escopo do auditor. |
| U-12 | a2-cd5cbf0f18dc sem-formato (G) | `#arquivo-apoio` | S1 | **não detectada** | O auditor deu o e-MAG 6.5 (`d301511184d7`) **conforme** pela instrução geral e o placeholder do select, sem confrontar a restrição de formato do upload. Julgamento contrário ⚠. |
| U-13 | a2-671056d628cb apresentacao-no-html (G) | `#msg-pendencia font[color], [align]` | sempre | detectada | **A2-03** (cláusula 1.1 "camadas lógicas" em `tambemViola`). |
| U-14 | a2-18bccce4132a grupo-sem-legend (G) | `#fs-avisos` | S1 | detectada | **A2-29**, e-MAG 6.7. |

**Por spec:** 7 detectadas · 2 com outra norma · 5 não detectadas. **Por unidade:** 8 · 3 · 5.
Das 5 não detectadas, 3 (U-01, U-02, U-05) não têm frase alguma na base literal — o auditor, preso a
essa base, não tinha como citá-las; é o tipo de obrigação "só no texto do DS" para que a A2 foi feita.

## 2. Alternativas válidas e chamarizes

| Instância | Papel | Resultado | Achados |
|---|---|---|---|
| `tbl-movimentacoes` | alternativa a2-959ca4537add associacao-por-headers | conforme | — |
| `msg-retorno` | alternativa a2-e5b4728ca51e prefixo-textual-visivel | conforme | — |
| `tip-protocolo` | alternativa a2-61f57f2a7ff5 balao-abaixo | **controle violado** | A2-17: a norma da alternativa se mantém (seta aponta para o gatilho, 8,3 px abaixo), mas a seta fica 9,2 px fora do centro do balão (a2-281b82e2e6be, elegível) |
| `btn-enviar` | chamariz | **violado** | A2-32 |
| `hdr-govbr` | chamariz | conforme | (A2-04 toca o `img` da marca só nos bytes) |
| `brd-trilha` | chamariz | **violado** | A2-08, A2-09, A2-10, A2-11 |
| `skp-conteudo` | chamariz | **violado** | A2-06, A2-07 |
| `ftr-govbr` | chamariz | conforme | (A2-04, idem) |
| `div-secoes` | chamariz | conforme | — |
| `crd-resumo` | chamariz | conforme | os achados dos gatilhos aninhados são das unidades `tip-*` |
| `btn-voltar` | chamariz | **violado** | A2-33, A2-11 |

## 3. Achados da auditoria (34)

**sorteada 14 · controle-conforme-violado 9 · não planejada 11.**

| Classe | Achados | Causa |
|---|---|---|
| sorteada | A2-01, 02, 03, 12, 13, 14, 15, 22, 23, 27, 28, 29, 30, 31 | as unidades da § 1 |
| controle violado · marcação oficial do DS | A2-06 (skiplink `role=menubar`, e-MAG 1.2 — **a mesma norma da U-11**), A2-08 (`span tabindex=0` no item atual, e-MAG 1.4 elegível), A2-10 (`aria-label="Breadcrumbs"`) | exemplos `skiplink-*.html` e `breadcrumb-default.html` do pacote, copiados como estão |
| controle violado · defeito de construção | A2-11 (três descrições para `meus-requerimentos.html`), A2-32, A2-33 (iniciais minúsculas nos botões) | escolhas da construção; plano § 4: andaime não conforme é defeito a corrigir |
| controle violado · core 3.7.0 | A2-07 (skiplink só com foco: `top:-100vh`), A2-09 (peso medium: `.crumb:last-child span`) | CSS do pacote; normas saíram como `andaime` no passo 1 |
| controle violado · core, corrigível | A2-17 (seta fora do centro na alternativa) | `BRTooltip` cria o Popper uma vez em `_create`; `_show` não atualiza (listado em `construcao.md` › condições de fundo) |
| não planejada · defeito de construção | A2-04 (`/>` em 10 vazios), A2-05 (sem `noscript`), A2-16 (rótulo do NUP passa de 640 px a 200 %, e-MAG 4.3 elegível — efeito da colocação do span da U-06, não da variante), A2-34 (SMS sem forma completa, e-MAG 3.12 elegível) | HTML e CSS da tela |
| não planejada · core, corrigível | A2-18 (seta fora do centro no balão do Fechar de msg-pendencia) | mesmo mecanismo do A2-17 |
| não planejada · core 3.7.0 | A2-19/20/21 (balão some ao ir para ele: `hideEvents=['mouseleave']`), A2-24 (`role=combobox` sem nome no contêiner: `BRSelect`), A2-25 (botão do upload com `aria-hidden`: `BRUpload`), A2-26 (rótulo preso ao input escondido: `BRUpload`; e-MAG 6.2 elegível) | código do pacote; A2-19…25 só têm WCAG, que não é fonte do universo (plano § 11) |

Nenhum achado caiu em "defeito genuíno extra" que não fosse da construção ou do core: a página só tem o
que foi escrito à mão ou o que veio do pacote.

## 4. Correções da construção (10; F-01…F-10)

Regra: a página tem de ser conforme em tudo, menos nas unidades sorteadas. Cada correção diz o que
**não** pode tocar. Incondicionais: F-04, F-05, F-06, F-08. As outras dependem de E-06, E-07 e E-09.

| # | Achados | Elemento · estado | Mudar | Não tocar |
|---|---|---|---|---|
| F-01 | A2-06 | `.atalhos-pagina` · todos | tirar `role=menubar`/`menuitem` (nav com links); registrar o desvio do exemplo | skiplink 1º filho, 1º Tab, destino |
| F-02 | A2-08 | item atual da trilha · todos | tirar `tabindex="0"` do `span aria-current` | ajustar a contagem de paradas de Tab (17 → 16 em S0) |
| F-03 | A2-10 | `nav.trilha-servico` · todos | `aria-label` em português | — |
| F-04 | A2-11 | Home, "Meus requerimentos", Voltar · todos | Home para página própria (`inicio.html` mínima); trilha e Voltar com a mesma descrição (recomendado "Meus Requerimentos") | Voltar continua `a.br-button.secondary` para `meus-requerimentos.html` (§ 14.5) |
| F-05 | A2-32, 33 | `.acao-enviar`, `.acao-voltar` | "Enviar Documento"; Voltar como F-04 | U-09/U-12: a mensagem de retorno continua sem nomear "Tipo de documento" |
| F-06 | A2-16 | span da U-06 em `#tip-protocolo-gatilho` · S0 a 640×450 | recolocar o rótulo para não passar de `clientWidth` (flex-wrap/reserva ou quebra em janela estreita) | U-06 nas duas cópias (visível, `clip:auto`, > 20 px, `elementFromPoint`), botão 40×40 centrado, alternativa balao-abaixo |
| F-07 | A2-17, 18 | `comportamento.js` · todos | `popperInstance.update()` ao abrir cada balão; nada mais muda | alternativa (bottom, ≤ 16 px, seta no gatilho), U-06 (`aria-labelledby`), U-05 (ícone continua `flex-start`) |
| F-08 | A2-34 | `label[for=aviso-sms]` · S1 | forma completa em texto na 1ª ocorrência (não só `abbr`, § 14.3) | U-07′: o input `#aviso-sms` não muda |
| F-09 | A2-04 | HTML servido | tirar a barra dos 10 vazios | o DOM não muda (o parser já descarta a barra) |
| F-10 | A2-05 | `body` | `noscript` com aviso curto, depois do skiplink, sem `style`/`script` embutido | skiplink 1º filho do `body` |

Depois: `npm run build` no corpus, `node tela-a2/conferir-construcao.mjs` (79/79 + um ponto conforme por
correção, inclusive a2-281b82e2e6be nos tooltips) e re-medida da auditoria (`conferir-auditoria.mjs`):
os 12 achados corrigidos somem, os 14 das unidades ficam, os 8 de fundo ficam.

## 5. Piso (plano § 14 / adendo da D § A: ≥ 8 specs, ≥ 3 famílias, ≥ 3 tipos do DS, ≥ 4 conformes)

| Cenário | Specs / unidades | Famílias | Conformes | Passa? |
|---|---|---|---|---|
| Só o que conta hoje (sem nenhum item a decidir) | 7 / 8 | F1, F3, F4 | 6 | **não** (7 < 8) |
| + E-01 (U-07, U-08) | 9 / 11 | F1, F3, F4 | 6 | sim |
| + E-02 (5 não detectadas) | 12 / 13 | F1, F3, F4 | 6 | sim |
| + E-01 e E-02 | 14 / 16 | F1, F3, F4 | 6 | sim |
| + E-03 (U-11 exposta: conta sem ela) | 13 / 15 | F1, F3, F4 | 6 | sim |
| idem, depois de F-01…F-07 e re-medida | 13 / 15 | F1, F3, F4 | 11 | sim |

Tipos do DS em todos os cenários: ≥ 5 (step, button, select, message, checkbox; com tudo também tab,
upload, switch, accordion). A U-08 (guia WAI-ARIA) não entra em nenhuma das quatro famílias.

## 6. O que fica registrado

- A recarga aos 300 s foi vista pelos dois lados (construção 300,2 s; auditoria 300,1 s). O complemento
  fora do protocolo mostra que ela zera S1 (aba, select, switch): numa bateria, uma sessão de agente
  que passe de 300 s em S1/S2 volta ao S0. O plano § 14.5 item 4 já declara isso; nada muda no runner.
- Ids de norma: os da base literal que o auditor leu. Conferir contra a base que o oráculo servir antes
  de congelar (as telas A e D usaram outra base, com outros ids para o e-MAG 1.2).
