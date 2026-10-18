# Pipeline de uma execução e arquivo de resultados (T4)

Plano: `thesis-workspace/planejamento/atual/plano-t4-pipeline-2026-10-03.md` (desenho, decisões, o que
foi verificado localmente e o que só um disparo real prova). Runner: `docs/runner-isolado.md` (T3).
Contratos: `docs/contratos-benchmark.md` (D-64). Evidências em Release: D-67.

## O que é

Um workflow manual, `.github/workflows/execucao-isolada.yml`: **um disparo = uma execução** (uma tela,
um braço, um modelo). Nada roda sozinho: sem `push`, sem agenda, sem matriz.

```text
preparar ──┬── coleta ──────────┐
           └── linhas-de-base ──┴── arquivar (sempre)
```

| Job | O que faz | Credencial que recebe |
|---|---|---|
| `preparar` | confere as entradas; baixa `govbr-telas` e `govbr-ds-validator` **pelo commit**; compila o oráculo e confere `dist/`, `data/` e o `site-manifest.json` contra `runner/images.lock.json`; grava o manifesto de coleta (site, referência, plano de estados, oráculo) | leitura (só nos checkouts) |
| `coleta` | checkout **sem gabaritos**; no braço sem, o oráculo nem é baixado; constrói as imagens nesta VM e confere as versões contra o lock; `run-once`; confere que nenhum contêiner recebeu token do GitHub/publicação; sobe o pacote **mesmo com falha** | o provedor, **só** no passo da coleta real |
| `linhas-de-base` | serve o mesmo site (bytes conferidos) e roda `run-baselines-flow.ts` com o mesmo manifesto: axe e validator não guiado comparáveis, guiado como diagnóstico, ESLint como já era (tela A lê o fonte do `govbr-corpus` no commit de origem do site; tela B declara ausência); registro `baseline.v1` com identidade e completude conferidas | leitura |
| `arquivar` | único com escrita no `govbr-resultados`: caminho único e imutável, índice, campanha e site congelado por conteúdo (T8a.1; o `govbr-telas` é lido no `telas_sha`), anexo de evidências na Release (sha256 conferido baixando de volta), push | escrita (e leitura do `govbr-telas`) |

Modos: `roteirizado` (agente roteirizado) e `duble` (cliente real contra o dublê) não chamam modelo,
gravam `fixture: true` e vão para `ensaios/`; `real` chama o modelo e vai para `execucoes/`.

## Configuração (uma vez, pela autora)

1. `govbr-eval` no GitHub com este workflow na `main`; `govbr-resultados` com um commit inicial na `main`.
2. Dois tokens *fine-grained* (GitHub → Settings → Developer settings → Fine-grained tokens), dono `nathlia`:

   | Segredo | Repositórios | Permissão |
   |---|---|---|
   | `GOVBR_LEITURA_TOKEN` | `govbr-telas`, `govbr-ds-validator`, `govbr-corpus` | Contents: **Read-only** |
   | `GOVBR_RESULTADOS_TOKEN` | só `govbr-resultados` | Contents: **Read and write** |
   | `GOVBR_RESULTADOS_LEITURA_TOKEN` | só `govbr-resultados` | Contents: **Read-only** (NAT-65: o `preparar` lê `indice/entradas` para contar as tentativas de uma campanha com agenda) |

   Nada além disso (Metadata: read vem junto). Validade curta (ex.: 90 dias) e renovar.
3. `CLAUDE_CODE_OAUTH_TOKEN`: `claude setup-token` na conta da assinatura.
4. `govbr-eval` → Settings → Secrets and variables → Actions → *New repository secret*: os quatro, com
   esses nomes. Sem o `GOVBR_RESULTADOS_LEITURA_TOKEN`, só disparos de campanha **com agenda** param no
   `preparar` (antes de qualquer gasto); o resto segue como antes.

## Disparar

GitHub → `govbr-eval` → Actions → `execucao-isolada` → *Run workflow*. Campos obrigatórios: campanha,
slot, e os **commits completos** (40 hex) de `govbr-telas` e `govbr-ds-validator` — nunca branch.
Ordem recomendada no primeiro uso: `roteirizado` → `duble` → `real`. Um disparo por vez (o grupo de
concorrência é único; um segundo disparo espera, e um terceiro na fila substitui o segundo).

**Campanha com agenda (T7, NAT-65): só o slot.** `campanha`, `slot`, `modo`, `tela` e os dois commits;
o resto fica vazio (`braco = da-agenda`, `esforco = da-campanha`, `par`, `tentativa`, `repeticao`,
`limite_min`, `modelo` vazios). O `preparar` resolve par, braço e repetição na agenda; modelo, esforço e
tempo limite na campanha; e a tentativa no índice do arquivo. Campo digitado que diverge é recusado.
`npm run campanha:agenda -- comando --campanha <id> --slot p03-com [--arquivo <clone>]` imprime o
`gh workflow run` pronto (com `--arquivo`, também a tentativa).

Repetir só a linha de base (falha técnica): `etapas = so-linha-de-base`,
`refazer_linha_de_base_de = <baselineId anterior>`, `motivo_refazer`. O agente não roda de novo.

Anexo não confirmado (Release indisponível): *Re-run failed jobs* refaz só `arquivar`; o mesmo pacote
gera os mesmos bytes, é aceito como reenvio e a entrega passa a `confirmado`. O modelo não é chamado.

**Tela B (`tela = vistorias`).** O workflow, o `t4.sh`, o manifesto, o `run-once` e o arquivo são
os mesmos; nada no caminho supõe a tela A. Para um ensaio (dublê ou roteirizado) basta:

- `tela = vistorias`, uma `campanha` NOVA (sem `campanhas/<id>/campaign.json` commitado, a de ensaio é
  gerada do disparo com `design.screens = [vistorias@govbr-telas-site-<sha12>]`; uma campanha
  commitada só serve se trouxer `vistorias` com a versão do site — a `ensaio-agenda-01` e a
  `t7-tela-a-01` são da tela A e são recusadas no `preparar`), `slot` e `par` livres, `braco` `sem`
  ou `com` (sem agenda) e `limite_min`;
- `telas_sha`: commit do `govbr-telas` cujo `site-manifest.json` declara `vistorias` e tem o sha256
  travado em `runner/images.lock.json` (`versions.telas.manifestSha256`); `validator_sha`: o do
  oráculo travado no mesmo lock;
- a linha de base sai na `linha-de-base-fluxo-2.2.0` (NAT-34) e o ESLint não roda (a tela não declara
  fonte; `eslintAusente` diz por quê).

A campanha real da tela B precisa do próprio `campaign.json` (e agenda) commitados antes da coleta.

**Trio (NAT-61, `braco = ferramentas`).** O terceiro braço usa o mesmo contêiner do oráculo do `com`, no
perfil `knowledge-free` (validator ≥ 2.14.0); o checkout e a compilação do validator rodam em `com` e em
`ferramentas`. Ensaio de trio sem campanha commitada: use um id de campanha com o segmento `trio`
(`ensaio-trio-01`): a campanha gerada é `campaign.v2` com os três braços e os mesmos bytes nos três
disparos do grupo; `ferramentas` com outro id é recusado no `preparar`. A campanha real de trio é
`campaign.v2` commitada com `design.order = "quadrado-latino"`, semente inteira em `design.seed` e as
comparações declaradas (ferramentas × com principal); a agenda (`agenda.v2`) gira a ordem dos braços em
quadrado latino por grupo (`scripts/agenda-campanha.ts`).

## Onde fica cada coisa no `govbr-resultados`

| Caminho | Conteúdo |
|---|---|
| `INDICE.md`, `indice/indice.json` | projeção de `indice/entradas/` (mais recente primeiro): estado técnico, isolamento, oráculo, submissão, linha de base, sha256 do anexo |
| `execucoes/<campanha>/<data>__<tela>__<família>__<braço>__rep-NN__<runId>/` | `pacote/` (run, findings, isolation, tool-events, artifact-manifest, refused), `despacho.json`, `resumo.md` |
| `ensaios/<campanha>/…` | o mesmo, para os modos sem modelo |
| `linhas-de-base/<campanha>/<tela>/<baselineId>/` | `baseline.json` (registro) + `bruta.json` |
| `coletas/<campanha>/<sha256>/manifesto-coleta.json` | manifesto do disparo (por conteúdo) |
| `snapshots/…` | referência e plano de estados (por conteúdo) e o conjunto `snapshot-manifest.v1` em `snapshots/conjuntos/<id>.json` (id derivado do conteúdo: igual nos dois braços de um par; num ensaio, `fixture: true`, o id inclui também a natureza — ver abaixo) |
| `snapshots/conjuntos/reparados/<id>.json` + `reparos/conjuntos-de-snapshots/<id>.json` | cópia real de um conjunto que um ensaio gravou antes com o mesmo id, e o registro do reparo que a autoriza (só o `snapshots-520e43f9433f78ac`, par p01 da `t7-tela-a-01`) |
| `campanhas/<campanha>/<sha256>/campaign.json` | a campanha que o manifesto de coleta 1.1.0 registra (T8a.1, por conteúdo) |
| `sites/<sha256 do site-manifest>/` | o site congelado servido às execuções: `site-manifest.json` + só os arquivos que ele lista, cada um conferido (T8a.1, por conteúdo; ~23 MB / ~15 MB comprimidos por versão do site, gravados uma vez) |
| Release `campanha-<id>` / `ensaios-<id>` | anexo `<pasta>.tar.gz` com o pacote **inteiro** (inclusive `evidence/`) |

Nada é sobrescrito: arquivo existente com outros bytes é recusado. Execução sem pacote (VM perdida,
cancelamento) entra no índice como `sem-pacote`. Pacote com valor de credencial não é publicado
(`retido-segredo`).

**Real e ensaio nunca dividem um conjunto de snapshots.** Até 2026-10-04 o id era só o hash dos itens
(site, referência, plano, instrumento). O dublê da `ensaio-agenda-01` gravou
`snapshots-520e43f9433f78ac` com `fixture: true`; o par p01 real da `t7-tela-a-01`, disparado no mesmo
commit, calculou os mesmos itens, e o arquivamento manteve o arquivo do ensaio. A análise do p01 então
recusava: “fixture misturada com dado real (snapshots × pacote)”. Agora:

- o id de um conjunto **real** continua o hash dos itens (os já arquivados, como o
  `snapshots-3effb497dc1c3c1a` dos pares p02–p10, não mudam);
- o id de um **ensaio** é o hash dos itens junto com `fixture: true`, então não coincide mais com o de
  um real;
- se o arquivo já existe com a outra natureza, o arquivamento **recusa**, a não ser que um reparo
  registrado exista (abaixo). Nunca reaproveita o arquivo do outro lado.

O caso já arquivado se conserta sem reescrever nada, com `scripts/ci/reparar-conjunto-fixture.ts`. O
script grava a cópia real ao lado (`snapshots/conjuntos/reparados/<id>.json`). Ela tem os mesmos
itens, o mesmo id (é o que o despacho e a linha de base já registram) e `fixture: false`. O
`createdAt` vem do manifesto do primeiro disparo real. O script grava também o registro
`reparos/conjuntos-de-snapshots/<id>.json`, com o quê e o porquê, o sha256 do original e da cópia, o
sha256 dos itens (iguais nos dois) e quem aponta o conjunto. O original fica intocado e continua
servindo ao ensaio. O painel e o arquivamento só leem a cópia quando o registro confere byte a byte.
Sem `--aplicar`, o script só mostra o que faria. Com `--aplicar`, grava e faz um commit, sem push.

```sh
npx tsx scripts/ci/reparar-conjunto-fixture.ts --arquivo ../govbr-resultados --conjunto snapshots-520e43f9433f78ac
npx tsx scripts/ci/reparar-conjunto-fixture.ts --arquivo ../govbr-resultados --conjunto snapshots-520e43f9433f78ac --aplicar
```

## Restaurar (cópia local, D-67)

```sh
git clone https://github.com/nathlia/govbr-resultados
gh release download campanha-<id> --repo nathlia/govbr-resultados --pattern '<pasta>.tar.gz'
npx tsx scripts/restaurar-execucao.ts --arquivo govbr-resultados --chave <runId> --anexo <pasta>.tar.gz --saida <pasta-nova>
npx tsx scripts/restaurar-execucao.ts --arquivo govbr-resultados --chave <baselineId> --saida <pasta-nova>
```

Confere o sha256 do anexo contra o índice, cada arquivo contra o `artifact-manifest.json`, as cópias do
repositório contra o anexo, o manifesto de coleta, a referência e o plano de estados e, no manifesto
1.1.0, a campanha e o site arquivados.

O painel de resultados faz essa restauração sozinho no botão **Preparar análise** (T8a.1), baixando o
anexo com o `gh` quando ele não está na máquina — ver [`painel-resultados.md`](painel-resultados.md).

## Campanha (T8a.1)

A análise (T6) exige o `campaign.json` da campanha, escrito **antes** da coleta. Por isso o manifesto
de coleta passou a `manifesto-coleta-isolada-1.1.0` e leva a campanha:

- **modo `real`**: `campanhas/<campanha>/campaign.json` precisa estar commitado no `govbr-eval` no
  commit do disparo. Sem ele, ou se ela não trouxer a tela (com a versão do site), o braço, o modelo
  e o oráculo do disparo, o `preparar` para **antes de qualquer gasto**.
- **modos `roteirizado` e `duble`**: sem arquivo commitado, uma campanha de ensaio (`fixture: true`)
  é gerada do próprio disparo, com os mesmos bytes nos dois braços de um par (campanha com `trio` no
  id: `campaign.v2` com os três braços, mesmos bytes nos três).

A campanha do piloto (T5, D-67) é [`campanhas/piloto-01/campaign.json`](../campanhas/piloto-01/campaign.json):
tela `solicitacao` no site `1a6e8daf3cdb` (`govbr-telas` `46318d4`), `claude-opus-5-5` `high`, oráculo 2.7.0.

O job `arquivar` grava a campanha e o site congelado (checkout do `govbr-telas` no `telas_sha`) por
conteúdo. Manifestos 1.0.0 continuam legíveis, mas não trazem campanha: o painel não prepara a
análise desses disparos.

### Identidade do disparo × campanha congelada (NAT-63, manifesto 1.2.0)

O manifesto passou a `manifesto-coleta-isolada-1.2.0` e grava em `execution` o que a coleta vai usar:
esforço (o mesmo que `entradas` passa ao cliente; `nao-se-aplica` no roteirizado), tempo limite em
segundos, cliente (Claude Code travado em `runner/images.lock.json`, ou `fake-agent`) e o sha256 do
protocolo (template da skill normalizado, o `templateSha256` que o run-once registra). O `preparar`
(`problemasDaCampanha` → `scripts/identidade-campanha.ts`) recusa, **antes de qualquer chamada de
modelo** e sem gravar o manifesto, quando qualquer um difere da campanha: `design.effort`,
`limits` (tempo, e turnos/orçamento — o runner não aplica nenhum dos dois, então a campanha não pode
exigi-los), `fixed.client`, `fixed.protocolSha256`, tentativa acima de
`retryPolicy.maxAttemptsPerSlot` e repetição acima de `design.repetitions` — além do que já conferia
(id, natureza, tela, braço, modelo, oráculo). O job `coleta` recebe os mesmos valores das mesmas
entradas e só roda se o `preparar` passou; o cliente das imagens construídas é conferido contra o lock
(`conferir-imagens`). Manifestos 1.1.0 (o piloto) continuam legíveis: a identidade é derivada do
despacho e do lock, e o protocolo, que eles não registram, é conferido na análise pelo `run.json`.
A mesma regra roda de novo na entrada da análise sobre cada `run.json` (ver
[`painel-resultados.md`](painel-resultados.md)). Ficam para a T7 (agenda de slots): o teto de
tentativas da campanha inteira e qual tentativa de cada slot entra — resolvidos pela agenda, abaixo.

### Agenda congelada de slots (T7.2, NAT-65, manifesto 1.3.0)

**Onde mora e por quê.** `campanhas/<id>/agenda.json`, **arquivo irmão** do `campaign.json` (contrato
`agenda.v1`, `scripts/agenda-campanha.ts`). A semente da ordem é o commit que congelou o protocolo, e a
agenda só pode ser escrita depois dele. Dentro do `campaign.json`, ela mudaria o sha256 da campanha
depois de congelada e exigiria mudar o `campaign.v1`. Então a referência vai no sentido inverso: a
agenda grava o sha256 dos **bytes** do `campaign.json` e o commit da semente. Campanha sem agenda
(piloto-01) segue como antes; campanha `formal` no modo real sem agenda é recusada.

**Gerar (uma vez):**

```
npm run campanha:agenda -- --campanha <id> --pares N --semente <commit 40 hex> [--janelas "dom-1:4,dom-2:6,..."]
npm run campanha:agenda -- conferir --campanha <id>       # regenera da semente e compara; confere a semente no git
```

- **Semente:** 40 hex; um commit deste repositório, no histórico do HEAD, que **tocou**
  `campanhas/<id>/`; os arquivos daquela pasta no commit não mudaram desde então; e a agenda ainda não
  existia nele. Qualquer outra coisa é recusada, como no sorteio da tela A.
- **Ordem (protocolo §5):** `chave(par) = sha256(semente + "|ordem|" + par)`; pares ordenados pela
  chave, ascendente; os ⌊N/2⌋ primeiros abrem com `sem`, os outros com `com`. **N ímpar:** o par a mais
  abre com `com`. Os pares rodam na ordem numérica (`p01`, `p02`, …); a chave só decide o braço que
  abre. Cada par é uma repetição (`p03` → repetição 3).
- **Slot:** `p03-com` = par, braço, posição no par (1º/2º), repetição, posição na agenda e janela
  (rótulo opcional, `--janelas` cobre os 2N slots na ordem).
- **A campanha precisa de:** os dois braços, uma tela e um modelo, `design.order = "balanceado"`,
  `design.repetitions = N` e `retryPolicy.campaignAttemptCeiling ≥ 2N`. O teto conta **todas** as
  tentativas (o protocolo de t7-tela-a-01: 20 + 4 extras = 24).

**No disparo** (`preparar`, antes de qualquer modelo):
1. `entradas` lê a agenda do checkout do `govbr-eval`, resolve par, braço e repetição pelo slot, e
   modelo, esforço e tempo limite pela campanha. Campo digitado diferente → recusa.
2. Só com agenda: checkout **esparso e só leitura** de `govbr-resultados/indice/entradas`
   (`GOVBR_RESULTADOS_LEITURA_TOKEN`). A coleta nunca o recebe; as saídas do job são ids e valores
   congelados.
3. O manifesto (`manifesto-coleta-isolada-1.3.0`) confere a agenda (bytes da campanha, regenerada da
   semente), o slot e a **tentativa** (`--tentativa auto`) e grava `agenda` (documento, sha256, slot,
   tentativas anteriores, extras usadas/limite). O `arquivar` grava a agenda por conteúdo em
   `campanhas/<id>/agendas/<sha256>/agenda.json`.

**Política de tentativas** (protocolo §7), contada nas entradas do índice do slot:
- disparo recusado antes do manifesto (sem `manifestoColeta`) não é tentativa;
- nova tentativa só depois de falha **técnica** (motivo em `retryPolicy.retryOn`; sem pacote depois do
  preflight conta como `vm-lost`). **Nunca** por `timeout` (conta como execução do agente, inelegível),
  resultado do agente (sem envio, envio recusado, 0 achados), isolamento falho ou pacote inválido;
- no máximo `maxAttemptsPerSlot` por slot e `campaignAttemptCeiling` na campanha. As extras vão para
  quem precisar primeiro; teto esgotado → slot perdido, par incompleto;
- entra na análise a **primeira tentativa elegível** do slot. O painel grava a escolha na receita
  (`preparo.selecaoTentativas`: a regra, a semente e todas as tentativas com a classe).

## Testes e prova local

- `npm run test:pipeline-t4` — workflow lido do YAML (gatilho, permissões, segredos por job/passo,
  nenhuma interpolação no shell, checkouts por SHA sem credencial guardada, coleta sem gabarito),
  entradas, lock das imagens, ambiente dos contêineres, `site-manifest.v1`, manifesto de coleta,
  linha de base, arquivo (imutável, idempotente, índice, anexo, segredo, sem pacote) e restauração.
  Com Docker, uma execução do agente roteirizado com tokens-sentinela no ambiente do runner.
  Sem Docker (`-- --sem-docker`), o arquivo recebe um pacote sintético de outra campanha/tela: o teste
  exige que ele seja recusado numa linha "pacote arquivado com problemas" e que o arquivamento da
  campanha e do site não gere nenhum problema.
- `npm run test:agenda` — NAT-65: agenda determinística (regra da chave, N ímpar, janelas), recusa de
  campanha incompatível e de semente (não-hex, não-commit, commit que não congelou a campanha),
  agenda adulterada, política de tentativas (preflight, técnica, teto do slot e da campanha, timeout,
  válida), resolução do slot nas entradas e no manifesto (divergências recusadas), planejado ×
  executado e desfecho no painel. `npm run test:estatistica` — o módulo estatístico.
- `npm run test:identidade` — NAT-63: identidade × campanha no preflight (manifesto do piloto e o
  caminho do `buildIsolatedManifest`) e na entrada da análise, e elegibilidade da comparação principal.
- `npm run ensaio:t4-linux` (`bash scripts/ci/ensaio-linux.sh`) — o workflow inteiro num Linux de verdade (Docker Engine em
  contêiner, controlador não-root com Node 24.21.0), a partir de `git clone` limpo, pelos passos do
  próprio YAML (`scripts/ci/emular-workflow.ts`), em modo `roteirizado`, com push num `govbr-resultados`
  local e restauração no fim. ~4 GB temporários, removidos ao final. `ENSAIO_TELA=vistorias` faz a
  mesma prova na tela B (padrão: `solicitacao`).

## Custo

Repositório privado no plano Free: 2.000 min/mês de Actions em Linux (×1), 500 MB de armazenamento de
artefatos (retenção de 14 dias aqui; cada pacote ~10–14 MB). Uma execução real usa o teto do agente
(até 90 min) + ~15–25 min de preparação, imagens e linha de base, somando os jobs; um ensaio
`roteirizado` gasta só a parte fixa. Anexos de Release não contam no armazenamento de Actions.
