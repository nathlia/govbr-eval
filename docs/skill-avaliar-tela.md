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

## Série 3.7.8 (11/11/2026): template `8139bb0c…`

Linha de base nova de harness e skill, igual nos três braços (decisão do assistente de 11/11; D-18: só
procedimento). O rastreio da `dev-375-b-01` mostrou que as pendências abertas devolvidas pelas ferramentas ficavam
sem decisão em 3 de 3 execuções do `com`: nada no texto impedia encerrar com elas abertas. Passo novo:

> 9. Antes de encerrar, releia a última resposta de cada ferramenta em cada rota: toda pendência que ela ainda der como
> aberta é decidida pelo caminho que a ferramenta indicar ou registrada em `limitations`, com o motivo.

Não nomeia ferramenta, pendência, regra nem componente; no `sem` nenhuma ferramenta devolve pendência e a frase não
pede nada. O `lint:skills` passa a exigir o trecho; a skill tem 1655 palavras (teto 1700). A mesma série muda o
relógio (renderizador 1.3.0, frase do `{{LIMITES}}`: ler sem sair da página) e a mensagem da recusa `rotas-misturadas`
do coletor (`collector-route-guard-1.0.1`: fato de outra rota ou estado é achado próprio, enviado à parte). Exige
reexportar o pacote `govbr-telas` antes da primeira campanha; campanhas congeladas não mudam. `sha256`
`8139bb0cd71d273e1f63294b2523478fd54fc2e05033cfc58f58bda174d83e3c`.

## Continuação B2 da lista 3.7.3 (06/11/2026): template `860feacb…`

O template atual explicita o tempo em segundos, calculado de `limites.tempoMinutos` pelo renderizador
1.1.0: 30 minutos viram 1800 segundos; 40 viram 2400. O marcador novo `{{TEMPO_SEGUNDOS}}` é opcional
para o renderizador: templates congelados que não o usam continuam renderizados byte a byte como antes,
inclusive o texto de `{{LIMITES}}`. As entradas e o procedimento permanecem idênticos nos três braços.

`inspection.clauses[].ref` pede explicitamente o identificador da cláusula recebida, nunca o id de um
achado, pendência, grupo ou sessão. Esses últimos pertencem a candidatos/evidência. O contrato e o scorer
não mudam, e o texto não promete validar automaticamente a origem de cada id declarado.

Na chegada a cada estado, o agente pede pelo menos 20 000 caracteres de resposta **se a ferramenta
permitir escolher esse limite**. Se o máximo permitido for menor, pede esse máximo e usa a continuação.
O texto comum não ensina nomes de ferramentas ou parâmetros. Isso importa porque o scan aceita 20 000,
mas outras consultas têm teto menor: não se deve induzir chamadas inválidas para aplicar um mínimo
universal. Sem essa capacidade, vale o procedimento existente de continuar as respostas cortadas.

Esta alteração exige novo hash de template nas campanhas futuras e reexportação do pacote de telas;
não altera templates/campanhas já congelados. Nenhuma campanha foi executada para validar esta fatia.
Validação determinística: `npm run test:avaliar-tela`, `npm run lint:skills`, `npm run lint:protocol`;
paridade dos três braços, segundos derivados de entradas diferentes e compatibilidade de template antigo.
O teto de concisão da skill passa de 1600 a 1700 palavras para estas instruções de procedimento.

## Versão da lista única 3.7.2 (B1–B4, 2026-11-04): template `054a183f…`

A versão da skill é o sha256 do template (`templateSha256`, quebras em LF), que cada campanha congela em
`fixed.protocolSha256` do `campaign.json` e que o run-once confere contra a cópia do pacote `govbr-telas`
(`skills/avaliar-tela/SKILL.md`). Todas as campanhas coletadas até a `dev-371-a2-01` fixam
`d9d5e99eff947fba99326d85bd264451fa912ace76b82e6a9fb0daac6bba2e5d` (D-156) e continuam com a cópia congelada
no pacote delas; nada nelas muda. A versão nova é
`054a183f2032136123458dfb9c457686c7d9e735708dfcbe546efed20ee282bc`, a das campanhas `dev-372-*`. Antes da
primeira delas: reexportar o pacote `govbr-telas` (a skill vai nele) e reconstruir as imagens do runner (o coletor
precisa validar o campo novo, ver abaixo).

Origem: os rastreios da rodada 3.7.1 (`thesis-workspace/planejamento/atual/mecanismo-oraculo-dev-371-b-2026-11-04.md`
§ 7 e `mecanismo-oraculo-dev-371-a-2026-11-04.md` § 7) e a lista
`lista-unica-correcoes-3.7.2-2026-11-04.md`, seção B. As quatro mudanças são regras de exploração e de relatório,
iguais nos três braços e sem regra, valor ou anatomia do DS. Cada passo que depende de ferramenta continua condicional
("Se houver ferramentas de validação…"), e o braço sem lê a forma de navegador da mesma frase.

| # | Texto novo (resumo) | Onde | Evidência que motivou |
|---|---|---|---|
| B1 | Abrir o detalhe de pelo menos um registro de cada situação distinta que a tela mostrar, não só o primeiro; usar as ferramentas de validação também em todo estado lido pelo navegador ("ler um estado não é medi-lo"); sem elas, medi-lo pelo navegador | passos 2 e 5 | B-22 p02 (os dois detalhes abertos não tinham a tabela); B-23 p02 (o 3028 só foi lido pelo Playwright) |
| B2 | Cláusula ou item de verificação com identificador que uma ferramenta entregar: medir no estado a que se refere e registrar o resultado em `inspection.clauses` (`medida` / `violada` / `nao-se-aplica`, com a medição) | passo 5, Registro de inspeção, exemplo | 0 `get_component_spec` em 5 rodadas na B; 16–19 cláusulas servidas por execução e nenhuma com estado (A e B) |
| B3 | Comparar as instâncias do mesmo componente em estados ou regiões diferentes pela ordem dos filhos e pela geometria medida; diferença é candidato | passo 8 | A-11: os três com tinham a marcação das duas mensagens, só o p02 comparou |
| B4 | Anotar o horário de início; não encerrar enquanto houver tempo e restar estado lido sem medição ou cláusula recebida sem resultado | passo 1 e Orçamento | B-22 p02 parou com 734 s de 1800; A: 12, 9 e 7 min de 30 |

**O campo `clauses` (B2).** Fica dentro de `report.inspection`, e não no achado nem no topo do relatório, por
dois motivos: (1) é declaração de percurso, como regiões, itens e candidatos; (2) erro no registro de inspeção nunca
derruba achado (o coletor guarda o registro à parte, `inspectionStatus: "invalid"`), enquanto um campo desconhecido no
topo do relatório faria o coletor recusar o envio inteiro. É a revisão aditiva `inspection.v1+clauses-1`
(`INSPECTION_CLAUSES_REVISION` em `contracts/index.ts`): o envelope continua `inspection.v1` e todo registro
válido antes continua válido. Item: `ref` (o identificador como a ferramenta o devolveu), `state` (id de
`states`), `status` (`medida` = medida e cumprida, `violada` = medida e não cumprida, `nao-se-aplica` = o
exigido não existe no estado), `measurement` (o que foi medido, com o valor) e `findings` (índices dos achados;
obrigatório e não vazio só em `violada`, proibido nos outros). Regras fora do schema, em
`contracts/inspection-ledger.mjs`: par (`ref`, `state`) único, estado conhecido, índice de achado existente,
`violada` com achado, `medida`/`nao-se-aplica` sem achado. Nada disso entra no scorer: a entrada do scorer com
`clauses` é a mesma sem ele (`test:inspecao`). Cláusula servida e não medida vai para `limitations`; o campo
não tem quarto estado.

**Coletor.** O coletor valida pelos schemas copiados para a imagem; o código dele não muda. A imagem nova ganha o rótulo
`govbr.collector.inspection-revision`, medido no próprio schema copiado (`collectorInspectionRevisionOf` em
`runner/build-images.ts`). Quando a skill do pacote pede `clauses`, o run-once só parte com a imagem travada que
declara `inspection.v1+clauses-1` (integridade `coletor-estado-de-clausula`): a imagem anterior marcaria o
registro de inspeção inteiro como inválido. A skill das campanhas coletadas não pede o campo e não exige nada. As
imagens de 2026-11-04T02:32 não têm o rótulo; as da rodada 3.7.2 (lock de 2026-11-04T08:13, coletor
`sha256:48322a58…`) declaram `inspection.v1+clauses-1`. O pacote `govbr-telas` reexportado com esta skill mantém o
site `88076aec26e9` (o hash do site cobre só `site/`); muda o `site-manifest.json` (`skills[]`, sha256 `6b771736…`).

**O que o texto não garante.** O estado por cláusula é declaração. Conferir se cada `ref` declarado foi mesmo servido
por uma ferramenta, e se toda cláusula servida recebeu estado, é trabalho do leitor do pacote (os payloads do oráculo
estão no pacote). Isso ainda não está implementado. O tempo também: o texto pede que o agente confira o tempo
decorrido, mas só o cliente aplica o limite.

Contagem: 1373 → 1569 palavras (meta do `lint:skills` 1400 → 1600). `lint:protocol` estrito, a varredura de gabarito e a
paridade dos três braços continuam verdes.

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
(com `rule: null` e com `findings: []`; e, desde a 3.7.2 B2, com e sem `inspection.clauses`), vocabulário proibido ausente da skill e do texto renderizado,
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
