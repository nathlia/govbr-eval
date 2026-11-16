# Tela E (página construída): congelamento da referência 1.0.0 (2026-11-16)

## O que foi congelado

**`ground-truth-cadastro-pais.json` 1.0.0**, na raiz do govbr-eval, ramo `tela-e`, num commit só dele:

| Campo (protocolo, `CONG-16`) | Valor |
|---|---|
| versão | `1.0.0` |
| commit (eval-e, ramo `tela-e`) | `4f200f263f6567212a4887636c081bad529e8dc5` |
| sha256 | `661cc54b7b291bc6e455065ecb23c08e5279bf7a0e9c7d6494afd78ae112c528` |

O nome segue a regra do repo para referência de tela (`ground-truth-<tela>.json`, `scripts/telas.ts`), com a tela
`cadastro-pais` (o `suite` da referência). `telas.json`, a main e o runner não foram tocados: o registro da tela, o
export no `govbr-telas` (`CONG-17`) e o inventário do DOM (`CONG-18`) são a bancada da E, passo posterior.

**Página congelada com ela:** govbr-corpus, ramo `tela-e`, commit `a050af3` (página `48d53d7`, F-01 `386a8d8`, F-02
`a050af3`). sha256 dos 36 arquivos servidos e das fontes em `pagina-congelada.json` (sha256
`da28641ff59e5e3496101585954f09f1050157400b10503a42b6d92b54b41f9a`). Os principais:

| Arquivo servido (`dist/`) | sha256 |
|---|---|
| `cadastro-pais.html` | `6d85aae9ec2a5e17db16cc74830185dfb5562b06068a2d5de5675977644f710f` |
| `assets/cadastro-pais-BwO4kZri.css` | `d15a3d6261c8ec587fa405bf202b0ac76db4cc567c10e92318a1881187b8720e` |
| `cadastro-pais/comportamento.js` | `853bf917aad2bde4db2fc356f7923d0d34ed091d574b0571b64c4bae17f9175c` |
| `cadastro-pais/core.min.js` (o do pacote 3.7.0) | `7fad494d8750e635ed0f94b1220466c682d248e2b7ce52932672939a008f45b4` |

## Contagens

- **Referência principal:** 8 specs (6 DS + 2 G), 8 unidades; 3 estados (S0 → S1 → S2, aditivos); 5 controles
  conformes; 5 specs com predicado de aceitação (estilo computado), 3 sem espécie implementada (razão em
  `porSpec.<U>.aceitacao`); 16 regras adicionais de co-violação nas 8 specs (17 com a U-09).
- **Variantes de sensibilidade declaradas** (`_meta.sensibilidades`): `semIdsExpostos` (3 specs com `rules` sem os
  ids expostos) e `comU09` (9 specs, 9 unidades: a principal mais a U-09 inteira).
- **Portão (§ 3.7):** 6 de 6 specs DS em vigor confirmadas pela regra combinada com a re-medida (limiar 5, folga 1);
  4 de 6 pela 1ª auditoria sozinha. A regra da re-medida foi fixada em 14/11, antes da medida (`remedida-mapa.json`,
  eval `6d456bd`; saída do 2º auditor só em `4dc0b2c`).
- **Ids de regra contra a base do oráculo congelado:** 26 conferidos (24 na principal, 2 só na `comU09`; 20 da base
  do DS, 6 e-MAG), 26 casam, 0 divergem.

## Conferências (comandos e resultados)

Página servida por `CORPUS_DIR="F:/Dev Nath/TCC/.tmp-eval/corpus-e" node tela-e2/servir.mjs 3219`, depois de
`npm run build` no corpus-e. Node 25.2.1 (`.node-version`). Nenhuma ferramenta do validator nem axe sobre a página.

| Passo | Comando | Resultado |
|---|---|---|
| Decisões aplicadas | `node tela-e2/montar-referencia-1.0.0.mjs` | candidata 1.0.0: 8 specs, 8 unidades (`decisoes-aplicadas-2026-11-16.md`) |
| Ids × base servida | `node tela-e2/conferir-ids-base.mjs` | validator 3.7.12 @ `816f4ba` (só leitura de `data/knowledge/`), base `3.7.0-literal-2026-10-15`, `rules.jsonl` sha256 `ca8f428a…` igual ao manifesto; 26/26 casam (`conferencia-ids-base.json`) |
| Construção (F-02) | `CORPUS_DIR=… node tela-e2/conferir-construcao.mjs --saida tela-e2/conferencia-construcao-2026-11-16.json` | 9/9 violadas, 9/9 conformes sem semente, 9/9 isoladas, 0 interferências, estados 33/33, pontos conformes 134/134 |
| Âncoras, caminho aditivo | `node tela-e2/conferir-ancoras.mjs` | 9 specs e 5 controles resolvem em S0 → S1 → S2; `ancoras-referencia.json` sem mudança |
| Observáveis, caminho aditivo | `node tela-e2/conferir-aditiva.mjs` | 26/26: instrução visível antes do 1º campo nos 3 estados; observáveis das sorteadas violados em cada estado declarado, sem recarga; 0 erro de página |
| Re-medida do 1º auditor | `node tela-e2/auditoria/rodar.mjs --saida <abs>/tela-e2/remedida-2026-11-16` e `node tela-e2/remedida-2026-11-16/comparar.mjs` | 12 achados, 114 conformes, 19 incertos — os mesmos de 14/11 por instância e chave (0 entrou, 0 saiu); 28/28 achado × estado reproduzidos; 199/199 citações |
| Referência (repo) | `APP_URL=http://127.0.0.1:3219 npx tsx tela-e2/conferir-referencia.ts ground-truth-cadastro-pais.json` (roda `scripts/check-reference.ts`, o de `npm run conferir:referencia`, com a tela declarada só em memória) | estados S0 → S1 → S2, 8 specs, 8 unidades, 5 predicados `sustenta` (mesmo desfecho em todos os estados medidos), 0 problema (`conferir-referencia-1.0.0.log`) |
| Portão | `node tela-e2/portao-com-remedida.mjs` | iscas 10/10; DS só 1ª 4, combinado 6. Reproduz `portao.json` byte a byte, menos o campo histórico `n_pelaLetraAnterior`, que o script lê do arquivo anterior e se perde ao regravar: o arquivo commitado ficou como estava |
| Portão na referência congelada | `node tela-e2/confirmar-portao.mjs ground-truth-cadastro-pais.json` | 6 de 6 DS: (1) confirmadas às cegas, (2) observável violado no estado declarado pelo caminho aditivo, (3) id sorteado na base servida com o mesmo texto (`portao-confirmacao-2026-11-16.json`) |

## Desvios declarados

- **DV-01, U-09 fora da principal.** Veredito isolado `violacao-nao-demonstrada` (sha256 `648daf95…`): sai do
  denominador de positivos da referência principal em 16/11 (D-202). É unidade G: não toca o portão nem a contagem
  DS. A regra E-02 do método não é aplicada a ela, por decisão explícita. A variante `comU09` guarda a spec inteira.
- **DV-02, S2 depois de S1.** Construção e auditoria mediram S2 a partir da carga; a referência usa a sequência
  aditiva. Conferido pelos caminhos aditivos acima.
- **DV-03, controles escolhidos depois da auditoria.** A regra dos 5 controles foi escrita depois de ver a cobertura
  da auditoria. O falso alarme sobre eles é descritivo e condicionado a essa seleção.

## Riscos e observações

- **Força servida diferente da do universo.** Em 7 dos 26 ids, a base servida dá força `recommended` (6) ou
  `permitted` (1, só na `comU09`). O universo e o passo 1 trataram essas unidades como obrigação, pelo marcador. Entre
  elas está o id sorteado de uma spec DS do portão (U-04) e os de duas G (U-07, U-08). Isso não é divergência de id
  nem de texto, e a detecção não depende de id. Mas o oráculo instrui o agente a citar como violada só norma que
  obriga ou proíbe, então a coluna "fundamentada" pode ficar baixa nessas specs no braço `com`.
- **Um id casou só depois de tirar as crases de código do markdown** (U-07, a sorteada): o texto é o mesmo, e a base
  guarda as marcas. A normalização (espaços, ênfase, crase) está no cabeçalho de `conferir-ids-base.mjs`.
- **F-02 e o auditor.** Os 3 incertos de obrigatoriedade continuam incertos na re-medida: o script do auditor os
  declara incertos com texto fixo (`auditoria/avaliar.mjs`, chave `obrigatorio-indicado`, `viola: null`), sem medir
  instrução. A presença da instrução é medida em `conferir-aditiva.mjs`. Não houve achado novo.
- **Predicados medem a troca, não a regra inteira.** Os 5 predicados (`forbidden` com `note`, um `allowed`) provam
  que o valor semeado está na página. Não creditam alegação. O `check-reference` também mede a U-06 em S0, com a
  mensagem oculta, e o valor computado é o mesmo.
- **Contagem por auditoria.** O portão passa pela regra combinada; só pela 1ª auditoria seriam 4 (não passaria).
  Fica declarado.
- **Quem montou a referência conhece o sorteio** (D-48). Por isso as confirmações vêm dos auditores cegos e das
  conferências por script.

## Commits deste congelamento

eval-e (`tela-e`): `4fcdf28` decisões aplicadas · `72c2792` ids × base · `a84b504` predicados · `ba0b9f5` F-02
conferida · `4476b2e` conferência da candidata e portão · **`4f200f2` referência 1.0.0 (sozinha)** · este registro.
corpus-e (`tela-e`): `a050af3` F-02. Nada foi enviado (sem push).
