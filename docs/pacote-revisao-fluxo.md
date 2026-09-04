# Pacote de revisão — suíte de fluxo (11.9 / D-21)

> Gerado por `npm run pacote:revisao`, lendo as sobras que o scorer produz agora — não
> os stubs arquivados. Escopo: a única execução pontuada sob o instrumento vigente.

- **instrumento:** `fluxo-1.1.0` · **gabarito:** `1.2.0`
- **execução:** agent-2026-09-02T06-21-31-820Z.json · claude-opus-5
- **unidades:** 23 a partir de 10 specs · **sobras pendentes:** 4

**Sobre cegueira.** `--blind` esconde o braço, e esta medida tem um único braço: não há
braço a esconder, e dizê-lo é mais honesto que encenar o procedimento. A ordem abaixo é o
hash do achado, o que ao menos evita ordenar por conveniência. Quando existir o par
`com`/`sem` (11.10), o procedimento cego volta a ser obrigatório.

## Vereditos

| veredito | quando | efeito |
|---|---|---|
| `falso-positivo` | não é verdade na página | cobrado da precisão |
| `lacuna-gabarito` | é verdade, e o gabarito nunca catalogou | sai do FP, entra na dívida |
| `vocabulario` | é a unidade abaixo, com nome que o scorer não conhece | casamento adjudicado (**exige `unit`**) |
| `deteccao-correta` | conteúdo certo, citação ou âncora inválida | credita detecção, não `ruleVerifiedTP` (**exige `unit`**) |
| `duplicado` | reformulação de outro achado já casado no mesmo elemento | sai do FP |
| `indeterminado` | revisado e indecidível | **segue cobrado como FP** |
| `composto` | a alegação afirma **mais de um defeito** | decidido por parte em `components` |

**O teste do defeito composto:** *consertar um defeito consertaria o outro?* Se não, são
duas unidades e o veredito é `composto`, com um componente por defeito. A alegação é
cobrada uma única vez se qualquer parte resolver em cobrança. Ver `docs/adjudicacao.md`.

Um veredito sem `rationale` não é aplicado: o scorer o ignora e segue cobrando o FP.
Carimbe também `adjudicatedBy` e `adjudicatedAt` em cada registro julgado.

## Referência — as specs do gabarito

| spec | âncora | regras aceitas | estado | casada nesta execução |
|---|---|---|---|---|
| **V-01** | `.opcao-identificacao` ×4 | `ds:token-spacing` | sempre | sim |
| **V-02** | `#cpf` ×1 | `wcag:1.3.1` · `wcag:3.3.2` · `emag:6.2` | sempre | sim |
| **V-03a** | `#cpf` ×1 | `wcag:3.3.1` | sempre | **não** |
| **V-03b** | `.mensagem-erro-cpf` ×1 | `wcag:4.1.3` · `emag:6.6` | apos-submit-vazio (cond.) | **não** |
| **V-04** | `.lista-opcoes` ×1 | `wcag:1.3.1` · `ds:item-content` | sempre | **não** |
| **V-05** | `.link-opcao` ×4 | `ds:token-focus` · `wcag:2.4.7` · `emag:4.4` | sempre | sim |
| **V-06** | `.barra-superior, .painel-institucional, .cartao-identificacao, .lista-opcoes, .opcao-identificacao` ×8 | `ds:token-color` | sempre | sim |
| **V-07** | `.selo-conta` ×1 | `ds:token-font-size` | sempre | sim |
| **V-08** | `input#cpf.br-input` ×1 | `ds:structure-input-tag` | sempre | sim |
| **V-09** | `.mensagem-erro-cpf` ×1 | `ds:token-color` | apos-submit-vazio (cond.) | **não** |

---

## As 4 alegações pendentes

### 1. `E-ee9ba1:74ed1b06`

- **elemento:** `.barra-recursos` — <div> "Alto Contraste VLibras"
- **regras citadas:** `emag:1.5`

> Não há âncora para pular direto ao conteúdo principal. A barra de acessibilidade traz apenas 'Alto Contraste' e 'VLibras'; a regra determina que a barra contenha os links de salto e que o primeiro leve ao conteúdo principal. Nenhum dos sete links da página aponta para um fragmento — todos têm href='/fluxo' — e o <main> não tem id que sirva de destino. Confirmado também pela tabulação: o primeiro ponto de parada é a marca gov.br, e percorrer a página exige passar por todos os controles do cabeçalho.

**Nenhuma spec do gabarito ancora neste elemento.** Se a alegação for verdadeira na
página, é `lacuna-gabarito`; se não for, `falso-positivo`.

```json
{ "id": "E-ee9ba1:74ed1b06", "verdict": "", "rationale": "" }
```

---

### 2. `E-7a5432:8ebd00f3`

- **elemento:** `#cpf` — <input#cpf> "Digite seu CPF"
- **regras citadas:** `emag:6.6`

> No estado de erro a mensagem não é identificada programaticamente. Ao submeter o formulário vazio surge <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p>, mas o campo não recebe aria-invalid='true' nem aria-describedby, o parágrafo não tem id que permitisse a associação, e não existe nenhum aria-live, role='alert' ou role='status' no documento inteiro. O foco permanece no botão Continuar. A regra exige texto no DOM (atendido), ligação por aria-describedby (ausente) e aria-invalid no campo (ausente), então quem usa leitor de tela não é informado do erro nem do campo que o causou. Verificado pelo oráculo (verify_finding: confirmed).

**Specs ancoradas neste elemento** — candidatas a `unit`:

- **V-02** `#cpf` · `wcag:1.3.1` · `wcag:3.3.2` · `emag:6.2` · **já casada** → se for esta, `duplicado`
  - o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo s
- **V-03a** `#cpf` · `wcag:3.3.1` · não casada → `vocabulario` ou `deteccao-correta` cabem
  - o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.

```json
{ "id": "E-7a5432:8ebd00f3", "verdict": "", "rationale": "" }
```

---

### 3. `E-7a5432:df14769a`

- **elemento:** `#cpf` — <input#cpf> "Digite seu CPF"
- **regras citadas:** `emag:6.3`

> Campo obrigatório sinalizado só programaticamente. O input traz aria-required='true', mas não há nenhuma indicação visual de obrigatoriedade: o texto inteiro do formulário é 'CPF' e 'Continuar', sem asterisco com legenda e sem a palavra 'obrigatório'. A regra exige as duas formas de indicação simultaneamente; aqui falta a visual, de modo que quem vê a tela não sabe que o campo é exigido antes de tentar submeter e receber o erro.

**Specs ancoradas neste elemento** — candidatas a `unit`:

- **V-02** `#cpf` · `wcag:1.3.1` · `wcag:3.3.2` · `emag:6.2` · **já casada** → se for esta, `duplicado`
  - o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo s
- **V-03a** `#cpf` · `wcag:3.3.1` · não casada → `vocabulario` ou `deteccao-correta` cabem
  - o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.

```json
{ "id": "E-7a5432:df14769a", "verdict": "", "rationale": "" }
```

---

### 4. `E-ee9ba1:fce4c972`

- **elemento:** `.barra-recursos` — <div> "Alto Contraste VLibras"
- **regras citadas:** `govbr-3.7.0-accessibility-global-1c3bd2a1c1a7`

> A barra de recursos deixa de ser utilizável em viewport móvel. A 320px de largura ela não quebra linha: seu retângulo termina em x=447 enquanto o clientWidth é 305, o documento passa a ter scrollWidth 447 e o botão VLibras fica fora da viewport, alcançável só com rolagem horizontal da página inteira. Foi o único bloco a ultrapassar a borda direita na medição de todos os elementos, e a captura de tela em 320x720 confirma o corte. Verificado pelo oráculo com reinspeção ao vivo (verify_finding: confirmed).

**Nenhuma spec do gabarito ancora neste elemento.** Se a alegação for verdadeira na
página, é `lacuna-gabarito`; se não for, `falso-positivo`.

```json
{ "id": "E-ee9ba1:fce4c972", "verdict": "", "rationale": "" }
```

---

## Depois de julgar

```
npm run adjudicate      # julgados, pendentes, registros não aplicáveis
npm run score:fluxo     # piso e adjudicado lado a lado
npm run pacote:revisao  # regenera este arquivo a partir das sobras atuais
```

Cada `lacuna-gabarito` vira dívida: escrevê-la no gabarito exige rodar de novo
`npm run baselines:fluxo` (D-06) e incrementar a versão do gabarito (D-31). Toda unidade
acrescentada assim vira FN para execuções que nunca tiveram chance de encontrá-la — o
viés de pooling se relata, não se corrige.
