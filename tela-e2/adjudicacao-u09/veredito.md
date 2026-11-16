# Tela E2 — adjudicação da U-09 pela evidência existente

**Veredito: `violacao-nao-demonstrada`.**

- **Data:** 2026-11-16.
- **Quem adjudica:** agente isolado, sem medição nova.
- **Mandato:** decisão da autora de 16/11. Um agente isolado julga a U-09 só com a evidência que já existe. Se nenhuma
  violação demonstrável existir, a U-09 sai do denominador de positivos, com o desvio registrado. A análise que a
  inclui fica como sensibilidade.
- **O que não foi feito:** nenhuma medição nova, nenhum navegador aberto, nenhuma ferramenta do validator, nenhum
  axe, nenhum modelo. Nenhum arquivo existente foi alterado. Esta pasta só acrescenta este arquivo e `veredito.json`.

## A pergunta

As medições que já existem demonstram que o observável exigido pela cláusula sorteada, lida ao pé da letra, está
violado na página, no estado declarado?

O ônus é de demonstrar a violação. Evidência insuficiente para decidir resulta em `violacao-nao-demonstrada`.

## (a) A cláusula sorteada e o observável que a decide

**Unidade:** `lst-paises::a2-5432c282d0d7`, classe G, variante `altura-fixa-corta`, estado S0 na janela 640×450 (o
equivalente declarado de 200 %). Fontes: `tela-e2/sorteio.json` › sementes (linha 5421),
`tela-e2/referencia-rascunho.json` › `porSpec.U-09`, `tela-e2/decisoes-da-autora.md` item 5.

**Id da base:** `emag:4.3`. A ponte é `tela-e2/ponte-base.json` › `a2-5432c282d0d7` = `{ "emag": "4.3", "ids": [] }`.

**Texto literal** (`tela-e2/universo.json`, unidade `a2-5432c282d0d7`, linha 52717; arquivo do corpus
`emag/emag-3.1-recomendacoes-1.1-a-6.8.md`, sha256 `cc4c5017…3c12`, força `obrigatoria`):

> Recomendação 4.3 – Permitir redimensionamento sem perda de funcionalidade

Contexto normativo da mesma unidade, literal:

> A página deve continuar legível e funcional mesmo quando redimensionada para até 200%. Assim, é preciso garantir
> que, quando a página for redimensionada, não ocorram sobreposições nem o aparecimento de uma barra horizontal.

A frase que a variante cita como cláusula (`tela-e2/elegibilidade-passo2.json` › `a2-5432c282d0d7` › variantes):

> A página deve continuar legível e funcional mesmo quando redimensionada para até 200%.

O mesmo julgamento do passo 2 dá esta razão para a categoria: *"o observável é perda de conteúdo ao ampliar"*.

**O que a cláusula obriga e proíbe.** A 200 %:

1. a página continua legível;
2. a página continua funcional;
3. não ocorrem sobreposições;
4. não aparece barra horizontal.

**O observável que a decide para esta instância.** A variante dá altura fixa e `overflow: hidden` a cada item da
lista. Por isso o observável é a perda de conteúdo dentro do item: algum texto (glifo) cortado ou escondido pela
borda de corte do item. Os observáveis complementares são a sobreposição visível de conteúdo e a rolagem horizontal.
O conteúdo de um item não violaria a cláusula se o único efeito do corte fosse cair espaço vazio (padding ou o
entrelinhamento da caixa de linha), sem tinta. Nesse caso o item continua legível, nada fica sobreposto e nenhuma
funcionalidade se perde.

**Fora desta adjudicação.** A co-violação DS em `rules` (`a2-a14d31901423`: "a altura deve variar de acordo com o
conteúdo") é outra cláusula. Ela não é a unidade sorteada e não cria spec (R-CV, `reconciliacao.md` § 5). Esta
adjudicação não a julga.

## (b) As medições que já existem

Foram consideradas **11 medições**. A estrutura das quatro primeiras e da M5 foi lida no código que as produziu, sem
rodá-lo: `conferir-construcao.mjs` linhas 210–217 e 465–471; `auditoria/interagir.mjs` linhas 206 e 219–230;
`remedida/remedir.mjs` linhas 112–124, 271–309 e 386–395.

| # | Fonte (arquivo) | Método | Valor | Observável medido |
|---|---|---|---|---|
| M1 | `tela-e2/conferencia-construcao.json` › `variantes.semeada.obs["lst-paises::a2-5432c282d0d7"]`; `.txt` linha 17 | Janela 640×450, S0, carga. Para cada `[role=listitem]`: `scrollHeight − clientHeight`. Conta "cortado" se a diferença for > 1 com `overflow-y: hidden` | `cortados: 4`, `faltaPx: [19, 19, 19, 19]` → `violado: true` | **Substituto**: transbordo da caixa rolável do item (inclui o padding inferior). Não mede tinta. |
| M2 | idem › `variantes.sem-semente` e `sem-lst-paises`; `.txt` linhas 18 e 27 | Mesmo método, página sem a semente | `faltaPx: [0, 0, 0, 0]` | Mesmo substituto. Mostra que a troca altera a altura do item, não que corta texto. |
| M3 | `tela-e2/conferencia-construcao.txt` linha 92 | 640×450, página: `scrollWidth` contra `clientWidth`, elementos além da janela | sem rolagem horizontal, nada além da janela | Barra horizontal: **conforme**. |
| M4 | `tela-e2/auditoria/conformes.json` › EC-111; `auditoria/medidas/EC-111.json`; `auditoria/medidas/interacoes/redimensionar-200.json` | 1ª auditoria cega, 640×450, S0/S1/S2: `scrollWidth`, `clientWidth`, elementos além da largura | `640 / 640`, `alemDaLargura: []` nos três estados → conforme | Barra horizontal: **conforme**. Não mediu corte dentro do item. |
| M5 | `tela-e2/auditoria/medidas/interacoes/lista-geometria.json` | 1ª auditoria, **1280×900**, S0: caixa e paddings de cada item | `h: 74` e padding de 16 px em cima, embaixo e à esquerda, nos 4 itens | Contexto: a altura fixa existe. Não é o estado de 200 %. |
| M6 | `tela-e2/remedida-2026-11-14/medidas/EC-112.json` e `…/interacoes/redimensionar-200.json` | Scripts da 1ª auditoria re-executados depois da F-01, mesmo método de M4 | `640 / 640`, `[]`, S0–S2 → conforme | Barra horizontal: **conforme**. |
| M7 | `tela-e2/remedida/remedida.json` › `itens.R-14.medido.itens[*].item` e `.secundario` | 2º auditor cego, 640×450, S0, item rolado ao centro. Geometria do item e caixa de linha do texto secundário contra o ancestral de corte | `scrollH 93`, `clientH 74`, `paddingBottom 16px`. A caixa de linha passa **1,59375 px** da borda de corte nos 4 itens. A caixa do secundário passa 2,89 px do topo do divisor | Caixa de linha, não tinta. Mostra que dos 19 px da M1, 16 px são padding. |
| M8 | idem › `tintaUltimaLinhaSecundario` | Métricas da fonte (`measureText`: `actualBoundingBoxDescent`) sobre a última linha do texto secundário | base da tinta 1446,44 contra a base do item 1447,84 (e assim nos 4 itens: 1521,44/1522,84; 1596,44/1597,84; 1671,44/1672,84) | **Tinta da última linha: dentro da borda de corte**, com 1,4 px de sobra. |
| M9 | idem › `pixels` | Captura de tela do item renderizado (já cortado pelo `overflow`), varredura linha a linha de pixels escuros (luminância < 150) na largura inteira do item | última linha de pixel com tinta **259**; divisor na linha **262** (geométrico 261,84 = base do item); **0** pixels escuros na linha do divisor (luminância mínima 204 = cinza do divisor); folga **2 px**, igual nos 4 itens | **Tinta como renderizada: nenhum glifo chega à borda de corte.** |
| M10 | idem › `medido.pagina` | 2º auditor, 640×450 | `rolagemHorizontalPx: 0` | Barra horizontal: **conforme**. |
| M11 | `tela-e2/auditoria/incertos.json` › EI-09; `auditoria/medidas/EI-09.json` | 1ª auditoria, 1280×900, S0: paradas de Tab e elementos interativos na lista | `paradasDeTabNosItens: 0`, `elementosInterativosNaLista: 0` | Contexto de "funcional": os itens não têm controle que se possa perder. Medido a 1280, não a 200 %. |

O 2º auditor decidiu `satisfaz` com `reproduz: true` (`remedida/remedida.json` › R-14;
`remedida-juncao.json` › R-14).

## (c) A conferência de construção mediu o observável ou um substituto?

**Um substituto.** A conferência (M1) compara `scrollHeight` com `clientHeight` do item. `scrollHeight` inclui o
padding inferior (16 px, M5 e M7), então a diferença de 19 px mede quanto a **caixa** do item transborda da altura
fixa. Ela não mede quanto **texto** fica escondido. A conta fecha com as outras medições:

- 93 − 74 = 19;
- 19 − 16 (padding inferior) ≈ 3 px de caixa de linha além da borda;
- desses ~3 px, a medição de tinta (M8, M9) não acha pixel de texto.

A descrição da U-09 no rascunho diz que "o conteúdo de cada item passa 19 px da altura visível". Ela lê o substituto
como se fosse o observável.

A conferência de construção também fixou o próprio critério de conformidade como `falta ≤ 1` px em
`scrollHeight − clientHeight`. Esse critério diz se a altura do item acompanha o conteúdo, que é o observável da
co-violação DS. Ele não diz se a página continua legível e funcional, sem sobreposição, a 200 %.

## (d) Raciocínio e veredito

1. **Legível (conteúdo perdido).** As duas medições que olham para a tinta concordam: nenhum glifo é cortado. A
   métrica de fonte (M8) põe a base da tinta 1,4 px acima da borda de corte. A varredura de pixels (M9) foi feita
   sobre a página como renderizada, e por isso já mostra o efeito do corte. Ela encontra a última linha com tinta
   2 px antes do divisor, e as linhas 260–261 sem tinta, nem mesmo de anti-aliasing. O algoritmo só aceitaria a
   linha 262 como divisor se as linhas anteriores tivessem luminância mínima ≥ 250 (`remedir.mjs` linha 304). Um
   glifo cortado pela borda deixaria tinta até a linha da borda. Nada no registro contradiz isso: M1 e M2 não medem
   tinta.
2. **Sobreposição.** A caixa de linha do texto secundário cruza o divisor em 1 px (M7). Mas a linha de pixel do
   divisor não tem nenhum pixel escuro (M9: 0, luminância mínima 204, o cinza do próprio divisor). Não há
   sobreposição visível de conteúdo, só de caixas.
3. **Barra horizontal.** Ausente em todas as medições que a mediram: M3, M4, M6 e M10.
4. **Funcional.** Nenhuma medição mostra perda de função. Os itens não têm elemento interativo (M11, medido a
   1280×900). Nenhuma das medições a 640×450 registra controle escondido ou inalcançável.
5. **A única medição que diz "violado" (M1) mede um substituto.** O substituto conta padding e entrelinhamento como
   "conteúdo". Ele não é contestado como número: os 19 px existem. O contestado é o que o número significa, e a
   conferência não mediu nada que ligue os 19 px a texto ilegível, sobreposto ou a função perdida.
6. **Limitação comum a todas as medições.** Todas usam a janela 640×450 como equivalente de 200 %, como o método
   declara. Não existe medição com zoom real do navegador. Isso não muda o veredito: o ônus é de demonstrar a
   violação, e não há medição no registro que a demonstre em nenhuma das duas condições.

**Veredito: `violacao-nao-demonstrada`.** A violação da Recomendação 4.3 do e-MAG não foi demonstrada pelas medições
existentes, no estado declarado (S0, 640×450). As medições do observável (tinta, sobreposição visível, rolagem
horizontal) dão todas conforme. A única medição em sentido contrário mede a caixa do item, não o conteúdo.

**Consequência, pela decisão da autora de 16/11:**

- a U-09 sai do denominador de positivos, com o desvio registrado;
- a análise que a mantém (E-02, `confirmacaoCega: false`) fica como sensibilidade.

Este arquivo não altera `referencia-rascunho.json` nem nenhum outro arquivo. Aplicar a consequência cabe a quem
mantém a referência.
