# Dossiê de adjudicação — primeira bateria da suíte de fluxo (02/09/2026)

Execuções: `runs-fluxo/agent-2026-09-02T02-29-59-458Z.json` (com oráculo) e
`runs-fluxo-ablacao/agent-2026-09-02T02-32-15-515Z.json` (sem). Cliente `codex-cli`, modelo
`gpt-5.6-luna`, protocolo `sha256:7e127b39…`, validator 2.0.0. Bateria de **sensibilidade a
modelo** (6.8), não a medida primária.

Piso: com oráculo TP 4 · FN 7 · FP 6 (F1 38,1%); sem oráculo TP 0 · FP 1.

**Os vereditos abaixo são PROPOSTOS, não aplicados.** Quem escreveu a tela de fluxo e o gabarito
não pode ser quem julga as sobras dela — é o viés que o D-21 existe para conter, e ele vale
inteiro aqui. O que este documento faz é reunir a evidência para que o julgamento seja barato:
o que foi medido no elemento, de onde o valor vem, e o que decorre. A ferramenta
`npm run adjudicate` ainda não varre os diretórios da suíte de fluxo (dívida (a) do D-25), então
nada foi escrito em `adjudications.json`.

---

## Braço com oráculo — 6 achados sem unidade

### 1 · `ds-token-color` na `.lista-opcoes` — proposta: **lacuna-gabarito**

Borda computada `#dee2e6`; o oráculo aponta `--gray-cool-10` (`#dfe1e2`) como mais próximo. O valor
não é token, e é **autoral**: vem de `fluxo.css`, `--tela-borda: #dee2e6`. É violação real de uma
regra que o gabarito não declarou para este elemento.

### 3 · `ds-token-font-size` no `.selo-conta` — proposta: **lacuna-gabarito**

`font-size: 11px`, fora da escala tipográfica. Autoral (`fluxo.css`). Mesma situação da anterior.

### 10 · `ds-structure-input-tag` no `#cpf` — proposta: **lacuna-gabarito**

A especificação canônica aplica `.br-input` a um `<div>`. A tela aplica a classe raiz **duas
vezes**: no `<div class="br-input campo-cpf-fluxo">` e no `<input class="br-input">` dentro dele. O
achado está certo e o gabarito não o previu.

### 9 · `ds-structure-divider-tag` no `<hr class="br-divider">` — proposta: **discussão declarada**

A especificação canônica aplica `.br-divider` a um `<span>`. A tela usa `<hr>`, que é o elemento
**semanticamente correto** para uma separação temática — e o D-10 já registra que os exemplos
oficiais do pacote contêm defeitos. Verdadeiro contra a especificação, discutível como norma. Não
tratar como falso positivo nem como acerto sem dizer qual dos dois; é material de Discussão.

### 4 · `ds-token-spacing` no `.selo-conta` — proposta: **falso-positivo do verificador**

A evidência do próprio achado diz: *"a margem observada inclui **143.641px**, fora da escala de
espaçamento"*. Ninguém escreveu 143,641px. É o valor **usado** de um `margin: … auto` resolvido
pelo layout flex, que `getComputedStyle` devolve já calculado. O verificador leu resultado de
layout como se fosse valor autoral.

### 8 · `ds-token-color` no `<hr>` — proposta: **falso-positivo do verificador**

Cor computada `#808080`, mais próxima de `--gray-40` (`#888888`). A tela não escreve essa cor em
lugar nenhum: `#808080` é o padrão do **agente de usuário** para `<hr>`, e nem pinta nada, já que
quem desenha a linha é a borda (`#cccccc`, que É token `--gray-20`). O verificador cobrou um valor
herdado do navegador.

> **4 e 8 são a mesma falha, e ela é do instrumento:** o verificador de tokens compara *valores
> computados* com a escala do DS sem distinguir o que a página **escreveu** do que o navegador
> **resolveu ou herdou**. Vai disparar em qualquer layout com `margin: auto` e em qualquer
> propriedade que a página não declara. É o mesmo padrão do D-27 num outro eixo: ali o verificador
> afirmava norma que não existia; aqui afirma autoria que não existe.

---

## Braço sem oráculo — 1 achado sem unidade

### `#cpf` · `wcag:3.3.1` — proposta: **nem FP nem acerto: defeito de ancoragem**

O achado: *"após enviar um CPF inválido (123), a interface não identifica o erro: sem mensagem
visível, sem `aria-invalid`, sem `aria-describedby`"*.

`wcag:3.3.1` **está** no conjunto de regras da V-03. O elemento é que difere: o gabarito ancora em
`.mensagem-erro-cpf`, e o agente ancorou no campo. E o motivo é material: a tela só cria a mensagem
quando o campo está **vazio** (`LoginPage.tsx` — `setErro(cpf.trim() ? null : …)`). O agente digitou
`123`; naquele estado **o elemento que o gabarito ancora não existe**. Ele observou corretamente um
defeito real e tirou zero.

Cobrar isso como falso positivo seria cobrar o agente por não adivinhar o estado que o gabarito
escolheu — e ele não pode ser informado do estado, senão vira mapa de correção (D-02).

---

## O que este dossiê deixa decidido para quem for julgar

1. Três lacunas de gabarito na tela de fluxo, todas autorais e todas verificáveis no CSS.
2. Dois falsos positivos com uma causa comum e corrigível: valor computado ≠ valor autoral.
3. Um achado que o esquema de ancoragem não consegue creditar, e que exige decidir a âncora da V-03
   antes da bateria primária.
4. Uma questão de norma (`<hr>` contra `<span>`) que não se resolve por adjudicação e vai para a
   Discussão.

---

## Encaminhamento implementado na Phase 10

- V-03 foi separada: `#cpf · wcag:3.3.1` é uma unidade permanente; o anúncio da mensagem é outra
  unidade, explicitamente condicional ao estado pós-submit vazio.
- As três lacunas autorais viraram V-06, V-07 e V-08 e só são aceitas porque o baseline executado
  do validator as detecta por regra exata.
- A re-medição determinística do estado condicional revelou uma quarta lacuna, que a bateria
  original não havia reportado: `.mensagem-erro-cpf { color: #e60000 }`. Ela virou V-09, também
  condicionada ao estado e protegida pelo mesmo baseline obrigatório.
- `margin:auto` resolvido e propriedade sem declaração autoral deixam de produzir finding.
- `<hr class="br-divider">` permanece evidência de divergência com o exemplo canônico, mas não é
  finding pontuável: a semântica nativa correta do HTML prevalece. O caso entra na Discussão como
  limite de tratar implementação oficial como norma, não em `adjudications.json`.
- `npm run adjudicate` agora inclui `runs-fluxo*` no mesmo modo cego. Após as correções de gabarito
  e do verificador, as antigas sete sobras se reduzem mecanicamente às alegações ainda não
  absorvidas; o histórico acima não é reescrito.
