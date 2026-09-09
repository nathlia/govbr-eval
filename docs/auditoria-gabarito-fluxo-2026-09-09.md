# Auditoria do gabarito de fluxo — item 13.5

**Data:** 2026-09-09 · **Gabarito auditado:** `ground-truth-fluxo.json` 1.2.0 (10 specs → 23 unidades)
**Instrumento:** `fluxo-1.1.0` · **Página:** `/fluxo.html`, estado `sempre`
**Método:** leitura do fonte (`govbr-corpus/src/pages/LoginPage.tsx`, `fluxo.css`) cruzada com
varredura determinística do oráculo 2.1.0 (`check_token_compliance` + `scan_page` structure/axe)
na página viva.

## Por que esta auditoria existe

O D-31 corrigiu a V-06: ela catalogava a borda `#dee2e6` em **um** elemento quando a variável
autoral `--tela-borda`, declarada uma vez em `:root`, pinta **oito**. A consequência não era
cosmética — a enumeração *correta* dos irmãos era cobrada como falso positivo. O item 13.5 pergunta
se as demais specs `unico` carregam o mesmo erro.

A resposta é: **uma carrega, em forma diferente, e há duas unidades que faltam no gabarito.**

---

## 1 · V-04 — o erro do V-06 em outra forma, e o conserto não é o mesmo

**O que a spec diz.** `scope: unico`, `expectedCount: 1`, âncora `.lista-opcoes`. Descrição: *"o
contêiner usa a classe `.br-list` e os filhos usam `.br-item`, mas nenhum carrega
`role="list"`/`role="listitem"` nem é `<ul>`/`<li>`"*.

**O que a página tem.** Um contêiner e **quatro** filhos `.br-item` (`LoginPage.tsx` 83–101).
A frase da spec acusa explicitamente os filhos; o gabarito ancora só no contêiner.

**Por que isso é pior que o caso V-06.** Rastreando `buildFlowUnits` e o casamento em
`units-flow.ts`: a spec gera **uma** unidade, cuja chave canônica é a do contêiner. Um agente que
reporta o defeito nos quatro itens não casa em nenhum passo —

| passo | o que faz | resultado para 4 achados nos filhos |
|---|---|---|
| 1 · exato | chave do achado == chave da unidade | não casa (chaves são dos filhos) |
| 1b · relacional | `relatedSelectors` do achado alcança a unidade | só casa se o agente **declarar** o contêiner |
| 2 · fallback por elemento | achado no elemento certo, sem norma | não casa (o "elemento certo" é o contêiner) |

Ou seja: **0 TP e 4 FP** para uma leitura correta da tela. No caso V-06 o agente ao menos ganhava
1 de 8; aqui ganha zero.

**Por que o conserto do V-06 não serve aqui.** Passar V-04 para `scope: todos` com
`expectedCount: 4` (ou 5, contando o contêiner) resolveria o casamento e criaria outro problema. As
oito bordas do V-06 são oito violações independentemente observáveis — cada elemento *tem* uma cor
fora do registro. Os quatro `.br-item` não têm, cada um, "falta de semântica de lista": a semântica
é propriedade do **conjunto**, e um único conserto a repara. Creditar quatro faria um agente que diz
*"o item 1 não tem listitem, o item 2 não tem listitem…"* valer quatro vezes o que vale um agente
que diz *"esta lista não tem semântica"* — premiar prolixidade, exatamente o que o D-30 recusou ao
fixar que **a cobrança é por alegação, não por parte**.

**O que falta no instrumento.** O D-29 resolveu este problema **do lado do achado**:
`relatedSelectors[]` deixa uma alegação sobre uma relação alcançar a unidade ancorada em outro
participante. Não existe o equivalente **do lado do gabarito** — uma spec não sabe dizer *"uma
unidade, e qualquer um destes cinco nós serve de âncora"*. Hoje `anchor` resolve para N chaves e o
número de chaves **é** o número de unidades; as duas coisas estão amarradas.

**Recomendação.** Separar as duas noções na spec: quantos elementos participam do defeito (`anchor`
resolvendo para os cinco) e quantas unidades ele vale (`expectedCount: 1`), com o casamento
aceitando qualquer participante e creditando uma vez. É a mesma ideia do D-29, na outra ponta.
Enquanto isso não existir, V-04 continua devolvendo 0 TP para uma leitura correta — e essa é a
única spec da tela em que isso acontece.

> **Não alterado nesta auditoria.** Mexer no gabarito muda a versão (1.2.0 → 1.3.0) e re-pontua a
> execução arquivada. É decisão de método, e o item 12.8 é onde ela se paga.

---

## 2 · Lacuna — duas unidades `ds:token-font-size` que o gabarito não tem

A varredura determinística no estado `sempre` acusa **três** violações de escala tipográfica; o
gabarito cataloga **uma**.

| elemento | `font-size` | mais próximo na escala | no gabarito? |
|---|---|---|---|
| `span.selo-conta` | 11px | `--font-size-scale-down-01` (11.662px) | **sim** — V-07 |
| `h2.nome-metodo` | 16px | `--font-size-scale-up-01` (16.8px) | **não** |
| `h2.titulo-outras-opcoes` | 16px | `--font-size-scale-up-01` (16.8px) | **não** |

São duas unidades reais, pela mesma regra que já sustenta a V-07, encontradas por medição
determinística — a mesma origem das lacunas pagas no D-28. Hoje um agente que as reporte leva
**2 falsos positivos**.

### A tolerância de 0,5px não é arbitrária — é arredondamento para pixel inteiro

Primeira leitura desta auditoria tratou os 0,5px como constante escolhida a esmo. Não é. A escala
do DS é modular e não redonda, e o corte cai exatamente onde o valor deixa de ser um passo da escala
transcrito para pixel cheio:

| na página | passo | distância | % | esse passo, arredondado | classificação |
|---|---|---|---|---|---|
| 20px | 20,16 | 0,160 | 0,79% | **20** | conforme — é o passo arredondado |
| 24px | 24,192 | 0,192 | 0,79% | **24** | conforme |
| 11px | 11,662 | 0,662 | 5,68% | 12 | acusado |
| 16px | 16,8 | 0,800 | 4,76% | 17 | acusado |

A escala inteira arredondada é `8, 10, 12, 14, 17, 20, 24, 29, 35`: 20 e 24 estão nela, 16 e 11 não.
Quem transcreve 20,16 para o CSS escreve 20px; quem escreveu 16px não arredondou 16,8 (isso daria
17), escolheu outro valor. O limiar é defensável, e subi-lo para admitir o 16px (precisaria de
>0,8) admitiria o 11px junto — a V-07 cairia de qualquer modo, só que por um limiar escolhido
depois de ver os resultados.

### O que isso não resolve, e foi o que decidiu o caso

A coerência do corte não responde à pergunta anterior: **isso deveria ser afirmado por um
verificador determinístico?** A única regra da KB sobre tamanho de fonte é a de fonte-base de 16px,
e é **informativa**. O achado se sustentava esticando a regra geral de consumo de token até cobrir
diferença sub-pixel, e aí o veredito passa a depender de onde se corta a tolerância em vez da norma.

**Resolvido pelo D-32:** `ds:token-font-size` saiu do canal de Findings e virou observação, pelo
mecanismo do D-27. Consequência para esta auditoria: as duas unidades de 16px **não** entram, e a
V-07 sai. O gabarito foi para 1.3.0 com 22 unidades; linhas de base remedidas em validator 9/22.

---

## 3 · Specs conferidas e limpas

| spec | por que `expectedCount: 1` está certo |
|---|---|
| **V-02** texto de apoio não associado | há **um** campo de formulário na tela (`#cpf`). A regra é condicional — só existe onde há texto de apoio — e só há um par campo/apoio. |
| **V-03a** estado de erro sem identificação programática | mesmo motivo: um único controle operável. |
| **V-03b** mensagem de erro sem `role="alert"` | uma única `.mensagem-erro-cpf`, e só no estado `apos-submit-vazio`. |
| **V-07** `font-size: 11px` | `.selo-conta` aparece **uma vez** no fonte (`LoginPage.tsx:87`), só na primeira opção. |
| **V-08** `.br-input` no `<input>` | um único `<input class="br-input">`; confirmado pela varredura (F-011, o único achado estrutural da tela). |
| **V-09** `color: #e60000` | uma única `.mensagem-erro-cpf`, estado condicional. |

### As specs `todos` conferem com o fonte

- **V-01** `padding: 13px` — quatro `.opcao-identificacao`. ✅ 4
- **V-05** foco suprimido — quatro `.link-opcao`; `.link-ajuda`, `.link-termo` e `.marca-govbr` não
  têm regra de foco autoral, então não entram. ✅ 4
- **V-06** `--tela-borda` — `.barra-superior` (1), `.painel-institucional` (2),
  `.cartao-identificacao` (3), `.lista-opcoes` (4) e as quatro `.opcao-identificacao` (5–8). ✅ 8

### Cores autorais que **não** são violação

Conferidas contra o registro de tokens, e todas resolvem: `#333333` = `--gray-80`,
`#555555` = `--gray-70`, `#f8f8f8` = `--gray-2`, `#1351b4` = azul institucional. São os gêmeos
conformes exigidos pelo D-24 — valores autorais que *não* violam nada, para que a simples presença
de uma variável `--tela-*` não vire detector de defeito.

---

## 4 · Observação lateral — o que o verificador alcança da V-06

A varredura acusa o `#dee2e6` em **três** elementos (os dois `<section>` e a `.lista-opcoes`), não
nos oito: `.barra-superior` e as quatro `.opcao-identificacao` declaram a cor em `border-bottom`, e
o verificador lê `border-color`. Não é defeito de gabarito — o gabarito descreve a página, não o
alcance da ferramenta — e já está embutido na linha de base medida (validator 10/23). Fica
registrado porque explica parte da distância entre 10 e 23, e porque é candidato natural a melhoria
do verificador quando houver razão para mexer nele.

---

## Resumo

| # | achado | efeito hoje | onde se paga |
|---|---|---|---|
| 1 | V-04 ancora só no contêiner; o defeito é relacional sobre 5 nós | leitura correta → **0 TP, 4 FP** | **em aberto** — 13.5 + instrumento |
| 2 | duas unidades `ds:token-font-size` (16px) fora do gabarito | — | **fechado pelo D-32**: a regra saiu do canal de achados; as duas não entram e V-07 sai |
| 3 | tolerância de 0,5px não declarada | — | **prejudicado**: sem a regra, não há limiar a declarar |

Seis das sete specs `unico` estão corretas. O erro do V-06 não se repetiu na forma em que apareceu
— nenhuma outra spec conta uma instância onde a página tem N do mesmo defeito independente —, mas
a V-04 tem o mesmo sintoma por outra causa, e é a mais grave das três, porque zera o crédito.

**Estado após o D-32:** achados 2 e 3 fechados; o achado 1 (V-04) segue aberto e é o que resta do
item 13.5. Gabarito em 1.3.0, 22 unidades a partir de 9 specs, validator 9/22.
