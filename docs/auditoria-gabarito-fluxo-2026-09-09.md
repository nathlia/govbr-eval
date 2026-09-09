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

### Nota de tolerância, que a próxima revisora precisa saber

A escala do DS não é redonda: base 14px, depois 16,8 · 20,16 · 24,192px. A página usa 20px
(`.titulo-identificacao`) e 24px (`.titulo-institucional`, `.marca-govbr`), que **também** estão
fora da escala exata — e não são acusados, porque o verificador aceita desvio de até 0,5px
(`tokenCompliance.ts:75`, `Math.abs(s - px) < 0.5`). 20 e 24 caem dentro (0,16 e 0,192); 16 e 11
caem fora (0,8 e 0,662).

Isso é decisão deliberada do instrumento, não descuido — mas **não está declarada no gabarito**, e
uma revisora que recalcule à mão contra a escala publicada contaria cinco violações onde o
instrumento conta três. A tolerância precisa estar escrita onde os vereditos são formados.

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
| 1 | V-04 ancora só no contêiner; o defeito é relacional sobre 5 nós | leitura correta → **0 TP, 4 FP** | 13.5 + instrumento |
| 2 | duas unidades `ds:token-font-size` (16px) fora do gabarito | quem reporta → **2 FP** | 12.8 |
| 3 | tolerância de 0,5px não declarada | revisora conta 5 onde o instrumento conta 3 | 12.7 (pacote de revisão) |

Seis das sete specs `unico` estão corretas. O erro do V-06 não se repetiu na forma em que apareceu
— nenhuma outra spec conta uma instância onde a página tem N do mesmo defeito independente —, mas
a V-04 tem o mesmo sintoma por outra causa, e é a mais grave das três, porque zera o crédito.
