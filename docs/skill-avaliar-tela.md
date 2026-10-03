# Skill `avaliar-tela` — o texto único da tarefa nos dois braços (T2)

`skills/avaliar-tela/SKILL.md` é o procedimento que o agente recebe no benchmark isolado. O texto
renderizado a partir dela é **o mesmo, byte a byte, no braço sem e no braço com**. A única diferença
intencional entre os braços é a configuração MCP: o oráculo montado ou não. Ela não faz parte do
texto. A skill vai para o pacote de coleta `govbr-telas` pelo exportador (ver
[`exportacao-telas.md`](exportacao-telas.md)).

A skill antiga `skills/evaluate-screen/SKILL.md` + `skills/_shared/evaluation-protocol.md` **não foi
alterada**: as baterias históricas citam o hash dela (`run-battery.ps1` concatena os dois arquivos).

## O que mudou em relação ao protocolo antigo, e por quê

A base é a revisão `thesis-workspace/planejamento/atual/revisao-prompt-ab-2026-10-02.md` (itens 1 a
5) e o D-63 (NAT-32).

| Protocolo antigo | `avaliar-tela` | Motivo |
|---|---|---|
| Exemplo com `"rule":"wcag:4.1.2"` | Exemplo com `"rule":null`. A linha de formato continua: `emag:<seção>`, `wcag:<critério>` ou `ds:<regra>`, só com marcadores e sem nenhum id concreto | Revisão, item 2: o problema era o critério concreto do exemplo. O texto de citação devia ficar, como a revisão recomenda |
| O alvo aparecia só no formato dos ids | O alvo é dito com todas as letras na descrição e na abertura: "conformidade com o padrão digital do governo federal (gov.br Design System) e à acessibilidade (e-MAG e WCAG 2.2)" | Escopo da tarefa, igual nos dois braços (ver abaixo) |
| Passos 5–6 do protocolo compartilhado mandavam recuperar achados por id, continuar pelo `scanId` e consultar regras sem condição | Todo passo que depende de ferramenta começa com "Se houver ferramentas de validação…" ou "Se uma ferramenta disponível…". Nenhum nome de ferramenta do oráculo aparece | Revisão, item 3: o braço sem lia ordens impossíveis de cumprir |
| — | Cláusula comum, literal: "Use as ferramentas de validação disponíveis para fundamentar a avaliação. Quando elas não estiverem disponíveis, inspecione a interface com as ferramentas de navegador e declare as incertezas. Não procure substitutos externos." | Plano, PROPOSTA de T2: pedir o uso de forma explícita, sem entregar a norma ao braço sem |
| "Antes de agir, leia `../_shared/evaluation-protocol.md`" | Texto autossuficiente: "não há arquivo a ler nem projeto a consultar" | Revisão, item 4: o pedido de leitura provocava a busca de um arquivo que não existe na raiz descartável |
| "A ausência do oráculo é uma condição experimental deliberada" | Removido. O texto não menciona oráculo, experimento nem braço | Um texto que diz "você está no braço sem" já é uma diferença entre os braços |
| Nada sobre o tamanho da janela | "A janela do navegador começa com o tamanho que o ambiente fixou. Não altere o tamanho da janela, o zoom nem a emulação de dispositivo." Outras larguras do escopo só pelo meio que as Entradas declaram (`{{MEIO_LARGURAS}}`, preenchido pelo runner) | D-63 / NAT-32: em 4 das 6 execuções da última bateria o agente redimensionou a janela para 1440 por conta própria, e 0 de 102 unidades foram alcançáveis nessa largura |
| URL, escopo e destino vinham numa "invocação" livre, depois do protocolo | Seção **Entradas** com marcadores fixos (`{{URL}}`, `{{ESCOPO}}`, `{{LARGURAS}}`, `{{MEIO_LARGURAS}}`, `{{ORIGEM_ENVIO}}`, `{{CAMINHO_ENVIO}}`, `{{LIMITES}}`) e uma função pura que os preenche | Hash reproduzível do texto e teste de igualdade entre braços |
| Contrato do achado (fluxo-1.3.0) | Igual: seletor, `relatedSelectors`, observado, esperado, `state.viewport` + `state.steps`, evidência; uma afirmação independente por achado; envio obrigatório também com `"findings": []`; incertezas em `notes` | O scorer e `findings.v1` não mudam |

Revisão, item 1 (o roteiro comum ensina o método): mantido. O procedimento de inspeção (árvore de
acessibilidade, DOM, estilos, teclado, foco, nomes, papéis, mensagens) continua igual nos dois braços.

Revisão, item 5 (lint não prova neutralidade): `lint:protocol` agora lê a skill nova em **modo
estrito**: blocos de código também, sem escape, e com os padrões de `FORBIDDEN_TASK_PATTERNS`. Mesmo
assim continua sendo heurística. A revisão manual de cada nova versão continua necessária.

**As normas-alvo são nomeadas de propósito.** Dizer contra o que a tela é avaliada (gov.br Design
System, e-MAG, WCAG 2.2) e em que formato a referência é citada é escopo da tarefa. Não é
conhecimento de domínio: o A6 proíbe regras, tokens, specs e componentes, não o nome da norma. O
texto é o mesmo nos dois braços. Sem o alvo, o braço sem teria de adivinhar contra o que avalia,
enquanto o braço com o descobriria pelas ferramentas do oráculo. Isso inclinaria a comparação a favor
do oráculo. A primeira versão desta skill (2026-10-02) tirou os nomes e a linha de formato, e isso
foi um erro. A causa foi aplicar à skill a varredura de vocabulário do exportador (wcag/emag/defeito…),
que existe para os bytes das telas em `site/` (comentários, nomes de classe). Corrigido no mesmo
dia: essa lista de palavras vale só para `site/` e para os arquivos neutros do exportador. A skill
continua sob a varredura de vazamento do gabarito (ids, regras e frases dos gabaritos e
adjudicações) e sob o modo estrito do `lint:protocol`, que proíbe ids concretos (`wcag:d`,
`emag:d`, `ds:<id>`, "4.1.2"), valores de token e anatomia `br-*`, mas permite os nomes das
normas e os três formatos com marcador. O texto continua dizendo "problema" no lugar de "defeito".

## Garantia de paridade entre braços

`scripts/render-task-prompt.ts`:

- `renderTaskPrompt(template, inputs)` é função pura e **não recebe o braço**. O texto depende só de
  `TaskInputs` (URL, escopo, larguras, meio para outras larguras, destino do envio, limites). A
  validação é estrita: um campo desconhecido, como um `arm` colocado nas entradas, é recusado. Um
  valor de entrada com vocabulário proibido também é recusado (por exemplo "5 problemas", "oráculo",
  `#ff0000`, "4.1.2").
- `renderRun(template, run)` separa o que difere entre execuções num canal lateral que nunca entra no
  texto. A allowlist `ARM_DIFF_ALLOWLIST` lista esses campos:

  | Campo | Por onde viaja |
  |---|---|
  | `arm` | config: o runner gera a configuração MCP do braço |
  | `runId` | env (`GOVBR_RUN_ID`) + armação do coletor pelo runner |
  | `collectorToken` | env (`GOVBR_COLLECTOR_TOKEN`), aplicado pelo proxy/coletor fora do agente |
  | `oracleProfile` | config: perfil de ferramentas do servidor MCP (null no sem) |

  O env é dos processos do runner, do coletor e do oráculo. T3 decide o que, desse env, chega ao
  processo do agente; o ideal é nada.
- `compareArmRenders(a, b)` falha se qualquer campo fora da allowlist diferir ou se o texto diferir
  em um byte que seja. Nesse caso, mostra o primeiro caractere divergente.
- Hashes: `promptSha256` = sha256 do texto renderizado (UTF-8, LF). `templateSha256` = sha256 do
  `SKILL.md` com fins de linha normalizados para LF, para não depender de `core.autocrlf`. No pacote,
  a skill já vai em LF e o hash dela está em `site-manifest.json` `skills[]`.

## Como renderizar

```sh
npm run render:tarefa -- --exemplo                       # entradas de exemplo embutidas, imprime o texto
npm run render:tarefa -- --inputs entradas.json --out prompt.txt [--arm sem|com] [--run-id <id>]
```

`entradas.json` tem a forma de `TaskInputs`:

```json
{"url":"http://127.0.0.1:3300/solicitacao.html","escopo":"a tela inteira, em todos os estados alcançáveis pela interface","larguras":[{"width":1280,"height":900}],"meioLarguras":null,"envio":{"origem":"http://127.0.0.1:4100/","caminho":"/api/submit"},"limites":{"tempoMinutos":30,"maxTurnos":null}}
```

A saída é um JSON com `promptSha256`, `templateSha256`, bytes e as chaves do canal lateral. `--arm`
muda só o canal, nunca o texto. O módulo usa só `node:`, então T3 pode levá-lo para o lado da coleta
sem precisar do govbr-eval.

## Testes

`npm run test:avaliar-tela`: paridade sem × com (inclusive com run id e credencial diferentes),
falha em diferença fora da allowlist, recusa de campo desconhecido e de vocabulário proibido nas
entradas, hash independente de CRLF, exemplo JSON válido em `validateFlowReport` e em `findings.v1`
(com `rule: null` e com `findings: []`), vocabulário proibido ausente da skill e do texto renderizado,
lista de ferramentas do oráculo conferida contra `govbr-ds-validator/src/server.ts`, seletores,
caminhos, estados e ids dos gabaritos ausentes da skill, e `lint:protocol` + `lint:skills` verdes.
`npm run test:export-telas` confere que a skill está no pacote com os bytes da fonte e que passa pela
varredura de vazamento do gabarito, inclusive com um trecho plantado na própria skill. A lista de
palavras de violação vale só para `site/` e para os outros arquivos do exportador.

## O que a skill só pode pedir (T3 tem de garantir tecnicamente)

- Janela fixa: o texto proíbe redimensionar, mas só o runner impede isso de fato, removendo ou
  bloqueando a ferramenta de redimensionamento e a emulação, e registrando cada tentativa. O meio
  para outras larguras (`{{MEIO_LARGURAS}}`) tem de existir no ambiente.
- "Não procure substitutos externos" e "não procure código-fonte": quem garante é a rede e o sistema
  de arquivos (proxy, raiz descartável, sem shell/web), não o texto.
- Limites de tempo e de turnos: aplicados pelo cliente/runner. O texto só pede que o agente envie o
  que tem.
- Envio obrigatório: a falta de envio é estado do run (`no-submission`), não `findings: []`.
- Canal lateral: o env com `runId` e a credencial do coletor não deve ficar legível pelo agente.
