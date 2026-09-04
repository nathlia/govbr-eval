# Pacote de revisão — suíte de fluxo (11.9 / D-21)

> Gerado por script. Escopo: **as alegações sem unidade da única execução pontuada sob**
> **`fluxo-1.1.0`** (claude-opus-5, effort high, perfil `combined`, 2026-09-02 06:21). As
> demais alegações de fluxo em `adjudications.json` vêm de execuções que o scorer recusa por
> incompatibilidade de instrumento (11.6): julgá-las não move número nenhum, e ficam fora.

**Sobre cegueira.** `--blind` esconde o braço. Esta medida tem **um único braço**, então não
há braço a esconder e o procedimento cego é vazio aqui — dizê-lo é mais honesto que
encená-lo. A ordem abaixo é o hash do achado, o que ao menos evita ordenar por conveniência.
Quando houver o par `com`/`sem` (11.10), o procedimento cego volta a valer e é obrigatório.

## Como usar

1. Suba o corpus (`:3000`) e abra `fluxo.html` ao lado. Para os itens marcados
   **estado condicional**, submeta o formulário vazio antes de olhar.
2. Julgue **na ordem em que aparecem aqui**, um por vez, sem pular adiante.
3. A pergunta de cada achado é **"isto é verdade na página?"** — nunca "isto seria
   conveniente para a medida?". Um achado plausível, bem escrito e falso é falso positivo,
   e é o tipo de erro mais informativo num agente que produz prosa convincente por construção.
4. Escreva `verdict` **e** `rationale` em `adjudications.json`. Veredito sem razão não é
   aplicado: o scorer o ignora e segue cobrando o FP.

## Vereditos

| veredito | quando | efeito |
|---|---|---|
| `falso-positivo` | não é verdade na página | cobrado da precisão |
| `lacuna-gabarito` | é verdade, e o gabarito nunca catalogou | sai do FP, entra na dívida |
| `vocabulario` | é a unidade abaixo, com nome que o scorer não conhece | casamento adjudicado (**exige `unit`**) |
| `deteccao-correta` | conteúdo certo, citação ou âncora inválida | credita detecção, não `ruleVerifiedTP` (**exige `unit`**) |
| `duplicado` | reformulação de outro achado já casado no mesmo elemento | sai do FP |
| `indeterminado` | revisado e indecidível | **segue cobrado como FP** |

`indeterminado` é assimétrico de propósito: a indecisão nunca melhora o número.

## Carimbo de identidade — obrigatório

Quem adjudica é a autora do trabalho, mas **não** a autora da tela nem do gabarito: os dois
foram gerados por assistente em sessões anteriores e commitados sob a sua identidade
(`Co-Authored-By: Claude` nos commits de `LoginPage.tsx`, `fluxo.css` e
`ground-truth-fluxo.json`). Ela portanto não sabe de cor quais violações foram injetadas —
é uma posição de revisão melhor que a do assistente, não pior.

O que permanece registrado como limite: o mesmo assistente gerou o corpus, o gabarito e as
68 propostas de veredito da suíte TC-*. Essas propostas seguem carimbadas
`aguarda revisão de NF` e não devem ser lidas como adjudicação independente enquanto não
forem revisadas. Em cada registro julgado aqui:

```json
"adjudicatedBy": "NF — autora do trabalho; não autora da tela nem do gabarito",
"adjudicatedAt": "2026-09-04"
```

E a leitura permanece: **piso é a métrica principal**, adjudicado entra ao lado como teto,
nunca no lugar (D-21).

## Referência — as 10 specs do gabarito

Use para separar `vocabulario` (a unidade existe, o nome está errado) de `lacuna-gabarito`
(a unidade não existe). Uma unidade **já casada** não aceita segundo casamento: se o achado
descreve uma dessas, o veredito é `duplicado`, não `vocabulario`.

| spec | âncora | regras aceitas | estado | casada em 06:21 |
|---|---|---|---|---|
| **V-01** | `.opcao-identificacao` ×4 | `ds:token-spacing` | sempre | sim |
| **V-02** | `#cpf` ×1 | `wcag:1.3.1` · `wcag:3.3.2` · `emag:6.2` | sempre | **não** |
| **V-03a** | `#cpf` ×1 | `wcag:3.3.1` | sempre | **não** |
| **V-03b** | `.mensagem-erro-cpf` ×1 | `wcag:4.1.3` · `emag:6.6` | apos-submit-vazio (cond.) | **não** |
| **V-04** | `.lista-opcoes` ×1 | `wcag:1.3.1` · `ds:item-content` | sempre | **não** |
| **V-05** | `.link-opcao` ×4 | `ds:token-focus` · `wcag:2.4.7` · `emag:4.4` | sempre | sim |
| **V-06** | `.lista-opcoes` ×1 | `ds:token-color` | sempre | sim |
| **V-07** | `.selo-conta` ×1 | `ds:token-font-size` | sempre | sim |
| **V-08** | `input#cpf.br-input` ×1 | `ds:structure-input-tag` | sempre | sim |
| **V-09** | `.mensagem-erro-cpf` ×1 | `ds:token-color` | apos-submit-vazio (cond.) | **não** |

---

## As 7 alegações

### 1. `E-7a5432:0918f5ad`

- **elemento:** `#cpf`
- **regra citada:** `emag:6.5`

> Campo de CPF sem instrução de formato. A regra exige que entradas complexas (CPF, CNPJ, data, telefone, CEP) tenham a instrução de formato visível antes do campo, e não apenas como placeholder. O único texto de apoio é o placeholder 'Digite seu CPF', que além de desaparecer ao digitar não informa formato algum (com ou sem pontuação, 11 dígitos). Não há <small>, elemento de dica nem aria-describedby no formulário — a consulta a 'form small, form [aria-describedby]' retorna vazio.

**Specs ancoradas neste elemento** — candidatas a `unit`:

- **V-02** `#cpf` · `wcag:1.3.1` · `wcag:3.3.2` · `emag:6.2` · não casada → `vocabulario` ou `deteccao-correta` cabem
  - o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo s
- **V-03a** `#cpf` · `wcag:3.3.1` · não casada → `vocabulario` ou `deteccao-correta` cabem
  - o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.

```json
{ "id": "E-7a5432:0918f5ad", "verdict": "", "rationale": "" }
```

---

### 2. `E-728b24:3b7021a4`

- **elemento:** `.painel-institucional, .cartao-identificacao, .lista-opcoes`
- **regra citada:** `ds-token-color`

> Borda em cor fora do registro de tokens. Os três contêineres computam border-color rgb(222, 226, 230) (#dee2e6), que não corresponde a nenhum token do DS; o valor mais próximo é --gray-cool-10 (#dfe1e2), a uma distância RGB de 4.24 — perto o bastante para indicar cópia de um cinza de outra biblioteca no lugar do token. O oráculo apontou o caso em .lista-opcoes; confirmei por estilo computado que as duas seções repetem exatamente o mesmo valor.

**Specs ancoradas neste elemento** — candidatas a `unit`:

- **V-04** `.lista-opcoes` · `wcag:1.3.1` · `ds:item-content` · não casada → `vocabulario` ou `deteccao-correta` cabem
  - o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃ
- **V-06** `.lista-opcoes` · `ds:token-color` · **já casada em 06:21** → se for esta, `duplicado`
  - a borda da lista usa #dee2e6, valor autoral em fluxo.css que não corresponde a token do gov.br DS. Lacuna encontrada na primeira medida e incorporada conforme D-28.

```json
{ "id": "E-728b24:3b7021a4", "verdict": "", "rationale": "" }
```

---

### 3. `E-ee9ba1:74ed1b06`

- **elemento:** `.barra-recursos`
- **participantes relacionais:** `main`
- **regra citada:** `emag:1.5`

> Não há âncora para pular direto ao conteúdo principal. A barra de acessibilidade traz apenas 'Alto Contraste' e 'VLibras'; a regra determina que a barra contenha os links de salto e que o primeiro leve ao conteúdo principal. Nenhum dos sete links da página aponta para um fragmento — todos têm href='/fluxo' — e o <main> não tem id que sirva de destino. Confirmado também pela tabulação: o primeiro ponto de parada é a marca gov.br, e percorrer a página exige passar por todos os controles do cabeçalho.

**Nenhuma spec do gabarito ancora neste elemento.** Se a alegação for verdadeira na
página, é `lacuna-gabarito`; se não for, `falso-positivo`.

```json
{ "id": "E-ee9ba1:74ed1b06", "verdict": "", "rationale": "" }
```

---

### 4. `E-033846:82351c81`

- **elemento:** `.painel-institucional, .cartao-identificacao, .lista-opcoes`
- **regra citada:** `ds-token-color`

> Borda em cor fora do registro de tokens. Os três contêineres computam border-color rgb(222, 226, 230) (#dee2e6), que não corresponde a nenhum token do DS; o valor mais próximo é --gray-cool-10 (#dfe1e2), a uma distância RGB de 4.24 — perto o bastante para indicar cópia de um cinza de outra biblioteca no lugar do token. O oráculo apontou o caso em .lista-opcoes; confirmei por estilo computado que as duas seções repetem exatamente o mesmo valor.

**Specs ancoradas neste elemento** — candidatas a `unit`:

- **V-04** `.lista-opcoes` · `wcag:1.3.1` · `ds:item-content` · não casada → `vocabulario` ou `deteccao-correta` cabem
  - o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃ
- **V-06** `.lista-opcoes` · `ds:token-color` · **já casada em 06:21** → se for esta, `duplicado`
  - a borda da lista usa #dee2e6, valor autoral em fluxo.css que não corresponde a token do gov.br DS. Lacuna encontrada na primeira medida e incorporada conforme D-28.

```json
{ "id": "E-033846:82351c81", "verdict": "", "rationale": "" }
```

---

### 5. `E-7a5432:8ebd00f3`

- **elemento:** `#cpf`
- **regra citada:** `emag:6.6`

> No estado de erro a mensagem não é identificada programaticamente. Ao submeter o formulário vazio surge <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p>, mas o campo não recebe aria-invalid='true' nem aria-describedby, o parágrafo não tem id que permitisse a associação, e não existe nenhum aria-live, role='alert' ou role='status' no documento inteiro. O foco permanece no botão Continuar. A regra exige texto no DOM (atendido), ligação por aria-describedby (ausente) e aria-invalid no campo (ausente), então quem usa leitor de tela não é informado do erro nem do campo que o causou. Verificado pelo oráculo (verify_finding: confirmed).

**Specs ancoradas neste elemento** — candidatas a `unit`:

- **V-02** `#cpf` · `wcag:1.3.1` · `wcag:3.3.2` · `emag:6.2` · não casada → `vocabulario` ou `deteccao-correta` cabem
  - o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo s
- **V-03a** `#cpf` · `wcag:3.3.1` · não casada → `vocabulario` ou `deteccao-correta` cabem
  - o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.

```json
{ "id": "E-7a5432:8ebd00f3", "verdict": "", "rationale": "" }
```

---

### 6. `E-7a5432:df14769a`

- **elemento:** `#cpf`
- **regra citada:** `emag:6.3`

> Campo obrigatório sinalizado só programaticamente. O input traz aria-required='true', mas não há nenhuma indicação visual de obrigatoriedade: o texto inteiro do formulário é 'CPF' e 'Continuar', sem asterisco com legenda e sem a palavra 'obrigatório'. A regra exige as duas formas de indicação simultaneamente; aqui falta a visual, de modo que quem vê a tela não sabe que o campo é exigido antes de tentar submeter e receber o erro.

**Specs ancoradas neste elemento** — candidatas a `unit`:

- **V-02** `#cpf` · `wcag:1.3.1` · `wcag:3.3.2` · `emag:6.2` · não casada → `vocabulario` ou `deteccao-correta` cabem
  - o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo s
- **V-03a** `#cpf` · `wcag:3.3.1` · não casada → `vocabulario` ou `deteccao-correta` cabem
  - o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.

```json
{ "id": "E-7a5432:df14769a", "verdict": "", "rationale": "" }
```

---

### 7. `E-ee9ba1:fce4c972`

- **elemento:** `.barra-recursos`
- **regra citada:** `govbr-3.7.0-accessibility-global-1c3bd2a1c1a7`

> A barra de recursos deixa de ser utilizável em viewport móvel. A 320px de largura ela não quebra linha: seu retângulo termina em x=447 enquanto o clientWidth é 305, o documento passa a ter scrollWidth 447 e o botão VLibras fica fora da viewport, alcançável só com rolagem horizontal da página inteira. Foi o único bloco a ultrapassar a borda direita na medição de todos os elementos, e a captura de tela em 320x720 confirma o corte. Verificado pelo oráculo com reinspeção ao vivo (verify_finding: confirmed).

**Nenhuma spec do gabarito ancora neste elemento.** Se a alegação for verdadeira na
página, é `lacuna-gabarito`; se não for, `falso-positivo`.

```json
{ "id": "E-ee9ba1:fce4c972", "verdict": "", "rationale": "" }
```

---

## Depois de julgar

```
npm run adjudicate      # julgados, pendentes, registros defeituosos, equilíbrio de descoberta
npm run score:fluxo     # imprime piso e adjudicado lado a lado
```

Cada `lacuna-gabarito` vira dívida: escrevê-la em `ground-truth-fluxo.json` exige rodar de
novo `npm run baselines:fluxo` para preencher a detecção medida das linhas de base (D-06),
nunca por intuição. E toda unidade acrescentada assim vira FN para execuções que nunca
tiveram chance de encontrá-la — o viés de pooling se relata, não se corrige.
