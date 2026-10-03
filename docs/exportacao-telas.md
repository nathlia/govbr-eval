# Exportação das telas — o projeto mínimo servido ao navegador da coleta

Método permanente do exportador `scripts/export-telas.ts` (T1 do plano do benchmark isolado,
`thesis-workspace/planejamento/atual/plano-implementacao-benchmark-isolado-2026-10-02.md`). Ele monta,
a partir do corpus e por lista explícita de arquivos, um projeto pequeno e clonável com as duas telas
de avaliação e um servidor estático. Esse projeto é o que a coleta serve ao navegador; ele não carrega
nada do lado da avaliação.

Nome provisório do projeto: `govbr-telas` (pendente NAT-45). A cópia local fica em
`F:\Dev Nath\TCC\govbr-telas\` (repositório git sem remoto, sem commit até a decisão do nome).

## Reexportar

```sh
npm run export:telas -- --out ../govbr-telas      # corpus limpo; audita no fim
npm run test:export-telas                          # exporta num temporário e roda toda a auditoria
```

`--out` precisa ser novo, vazio, ou conter só `.git` e uma exportação anterior (que é substituída).
Com o corpus sujo a exportação para; `--allow-dirty` exporta assim mesmo e grava
`origin.corpus.dirty: true` no manifesto. O exportador nunca escreve no corpus: o build vai para um
diretório temporário apagado no fim.

## O que entra

| Caminho no pacote | De onde vem | Como é escolhido |
|---|---|---|
| `site/solicitacao.html` + `site/assets/*` | build de produção do corpus (`vite build --outDir <temporário>`) | `assetClosure` da superfície de medida a partir de `solicitacao.html`, depois de tirar do build o que o Vite copiou de `public/`. O fechamento tem de caber no padrão da tela (a página e `assets/`); um arquivo de outra entrada (`index.html`, `fluxo*`, `main-*`) faz a exportação parar. |
| `site/pnip/**` | `govbr-corpus/public/pnip/` (build Angular congelado) | Exatamente a lista do manifesto do congelamento (`manifesto.json`), cada arquivo conferido por sha256; árvore com arquivo a mais ou a menos faz a exportação parar. O manifesto do congelamento fica de fora (telas.json `isolamento.site.excluir`). |
| `server.mjs`, `README.md` | modelos em `scripts/export-telas/` | copiados como estão |
| `package.json`, `.node-version`, `.gitattributes`, `site-manifest.json` | gerados pelo exportador | — |
| `skills/avaliar-tela/SKILL.md` | `govbr-eval/skills/avaliar-tela/SKILL.md` (T2) | `PACKAGE_SKILLS`, lista fechada de uma entrada; fins de linha normalizados para LF; hash em `skills[]` do manifesto. Nada mais de `skills/` entra (o protocolo antigo `evaluate-screen` + `_shared/` e `evaluate-all` ficam fora). O servidor não o serve (404). Ver [`skill-avaliar-tela.md`](skill-avaliar-tela.md). |

Os bytes servidos são os mesmos que a superfície de medida congelou: o teste compara cada tela com a
última superfície em `pipeline/logs/*-superficie/` (hoje, `solicitacao` = 14 arquivos e `vistorias` =
190 arquivos, idênticos). Uma mudança substantiva em qualquer tela exige nova identidade de tela; o
exportador não faz nenhuma.

## O que não entra, e por quê

- `.git`, histórico, `node_modules`, fontes do corpus (`src/`, `*.tsx`, `vite.config.ts`): o
  navegador recebe só o build; o caminho `/@fs` e o servidor de desenvolvimento do Vite não existem.
- Referências (`ground-truth-*.json`), adjudicações, revisões, resultados, relatórios, tese, planos:
  nada da avaliação entra no pacote servido.
- Outras alas do corpus (`real/`, `static/`, a suíte `TC-*`, a tela de fluxo).
- Source maps: o build do corpus não os emite, o congelamento do PNIP também não
  (`build.sourceMaps: false`), e a auditoria falha com qualquer `*.map` ou diretiva
  `sourceMappingURL` no início de linha.

## O servidor

`server.mjs` usa só módulos nativos do Node. Na partida carrega na memória os arquivos de
`site-manifest.json` e confere o sha256 de cada um: arquivo alterado, o servidor não sobe. Depois:

- caminho exato de um arquivo: 200; o alias declarado em telas.json
  (`/assets/images/exit-icon.png` → `pnip/assets/images/exit-icon.png`): 200;
- GET sem extensão sob `/pnip/`: 200 com `pnip/index.html` (rotas da SPA, mesma regra da superfície);
- `..`, `.`, barra invertida, `%2e`/`%2f`/`%5c`/`%00`, letra de unidade: 400;
- qualquer outro caminho: 404, sem listagem de diretório; método diferente de GET/HEAD: 405.

Escuta em `127.0.0.1:3300` por padrão (`--port`/`PORT`, `--host`/`HOST`). Endereços: A =
`/solicitacao.html`, B = `/pnip/portal-mpa/vistorias?mock-perfil=mpa`.

## O manifesto (`site-manifest.json`)

Subconjunto documentado de `snapshot-manifest.v1`. O contrato completo exige quatro itens (site,
referência, plano de estados, instrumento); o pacote de telas só pode preencher o primeiro — os outros
três são do lado da avaliação e nunca entram aqui. Por isso o arquivo é `site-manifest.v1` com
`subsetOf: "snapshot-manifest.v1"` e um `item` com a forma exata de um item `kind: "site"` daquele
contrato: `sha256` = hash da listagem `sha256  caminho` ordenada de `files[]` (formato do
`sha256sum`), `bytes` = soma dos arquivos servidos, `location` = `package-path` `site`. O teste
compõe esse item com três marcadores sintéticos num `snapshot-manifest.v1` (fixture) e o valida com
`validateContract`. `exposedToAgent: false` vale para o pacote como arquivos: pelo plano, o agente
alcança só os bytes servidos pelo navegador, nunca a pasta. Se T3 montar a pasta na raiz do agente,
esse campo e a classificação precisam ser revistos.

Além do item: `screens` (id, título neutro, entrada), `routing` (SPA e alias), `origin` (commit e
estado do corpus; comando, Vite e Node do build da tela A; sha256 do manifesto do congelamento e a
proveniência do build da tela B), `files[]` (caminho, sha256, bytes de cada arquivo servido),
`runtime[]` (o mesmo para os arquivos da raiz), `skills[]` (o mesmo para a skill, desde
`export-telas-1.1.0`) e `total`.

## Node

`.node-version` = **25.2.1**: é o Node que construiu a tela A no lado da preparação (o pino do
workspace), está dentro do intervalo do Vite do corpus (`^20.19.0 || >=22.12.0`, conferido pelo teste)
e é o único com que a pasta limpa foi exercitada. O servidor usa só módulos nativos e roda em
qualquer Node ≥ 20.19 (`engines` do `package.json`). Ressalva para T3: a linha 25 não é LTS e já
saiu de suporte; a imagem da coleta deve fixar uma LTS (24.x) e reexportar com o `.node-version`
correspondente, sem mudar um byte de `site/` (o build da tela A independe do Node do servidor; a
paridade com a superfície de medida acusa qualquer diferença).

`.gitattributes` (`* -text`): com `core.autocrlf=true` (padrão do Git no Windows) um clone trocaria
LF por CRLF, o sha256 deixaria de bater e o servidor não subiria. O teste faz commit num repositório
temporário com `core.autocrlf=true`, clona e audita o clone.

## A auditoria

`auditPackage` (no exportador; roda no fim de toda exportação) não depende de nada da avaliação:

- allowlist: só os arquivos da raiz listados, a skill de `PACKAGE_SKILLS` (com hash conferido contra
  `skills[]`) e os de `site/` presentes em `files[]`; nada a mais, nada faltando; extensões de `site/` numa lista fechada;
- nenhum arquivo ou diretório oculto além de `.node-version` e `.gitattributes` (`.git` do clone local
  é ignorado);
- nenhum `*.map`, nenhuma diretiva `sourceMappingURL`;
- nenhum caminho da máquina de preparação nem o nome da usuária em arquivo de texto — derivados do
  ambiente (`machineText()`: pasta do workspace, a pasta acima dela, `homedir`, `C:\Users`, nome de
  usuário), nunca escritos à mão;
- sha256 e tamanho de cada arquivo = manifesto; `item.sha256`, `item.bytes` e `total` coerentes.

`npm run test:export-telas` acrescenta o que precisa do lado da avaliação:

1. **Violação plantada**: numa cópia, um `.map`, um oculto, um arquivo fora da lista, uma diretiva e
   o caminho do workspace — a auditoria tem de acusar cada um pelo nome.
2. **Vazamento do gabarito** (o agente nunca vê esta etapa): de todo `ground-truth-*.json`,
   `organic-ground-truth.json` e `adjudications.json` saem ids (`A-03`, `B-06`, `TC-…`, inclusive em
   chaves), ids de regra (`govbr-…-<hash>`, `emag:`, `wcag:`) e todas as sequências de 6 palavras de
   qualquer texto. Nenhuma pode aparecer em arquivo de texto do pacote (sem distinção de caixa). Uma
   sequência que só aparece colada por hífen, barra ou dois-pontos — classe CSS, seletor, URL, valor
   de estilo — é a referência CITANDO a página, não o contrário: é relatada, não falha. Em prosa
   (espaço em todos os separadores), falha com arquivo e trecho. Uma cópia com um id e uma descrição
   plantados prova que a varredura os acha.
3. **Vocabulário** (`violation`, `violação`, `defeito`, `injected`, `injetado`, `plantado`,
   `gabarito`, `ground-truth`, `wcag`, `emag`, `benchmark`, `tcc`): relatado arquivo a arquivo; falha
   só nos arquivos que o exportador escreve. Ocorrência em código de terceiros é listada para
   classificação humana, nunca editada na tela.
4. **Pasta limpa**: o clone vai para um diretório temporário fora do workspace; `server.mjs` sobe numa
   porta livre com ambiente mínimo (`PATH`), sem `npm install`. Todos os arquivos do manifesto são
   pedidos e conferidos por sha256; rotas da SPA e o alias respondem; 27 tentativas de travessia e de
   arquivos fora do site respondem 400/404/405. Playwright (headless, um navegador) abre A e B, executa
   a interação de `telas.json` e os passos `setup` das referências — lidos em tempo de teste, nunca
   copiados para o pacote; `navigate` por `pushState` + `popstate`, como o instrumento —, exige que
   nenhum pedido saia da origem e que nenhum falhe, e compara o console com o do mesmo site servido
   pela superfície de medida (mensagens novas falham).

## Ocorrências relatadas na exportação atual (corpus `5a3c3f8`)

- `site/pnip/scripts.fc2a7d38df25b0e7.js`: a palavra `sourceMappingURL` dentro de código de biblioteca
  (gera mapa em tempo de execução para CSS injetado); não é diretiva nem aponta para arquivo.
- Mesmo arquivo: `injected` em `unwrapInjectedRef`, identificador de biblioteca de terceiros.
- Sequências de 6 palavras em forma de código: classes do DS (`br-tag primary-pastel-01 small`,
  `bg-orange-vivid-30 text-pure-0`), o `src` do ícone "Sair", um estilo inline e a própria URL de
  entrada da tela B (no README e no manifesto). Todas são conteúdo da página que a referência cita.

Nenhuma sequência em prosa, nenhum id e nenhuma regra do gabarito aparecem no pacote.
