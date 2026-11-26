# Tela F — filtros mecânicos e composição (agente da referência, 26/11/2026)

Implementa o `adendo-tela-f-protocolo-2026-11-26.md` § 4, itens 3 e 4, ao pé da letra. Ramo `tela-f` do
`govbr-eval` (worktree `.tmp-eval/eval-tela-f`), sem push. Node 25.2.1 (`TCC/.node-version`).

## Insumos selados (cópia byte a byte de `.tmp-eval/tela-f-selada/`)

| Arquivo | sha256 |
|---|---|
| `selecao/candidatos.json` (24 candidatos, 6 por nível) | `e81cb4b9cff076f83743d77c2da249a0df62b00f40cfceff88193e3131510d2a` |
| `conferencia/veredictos.json` (conferente) | `9fe92e8d35510cc81cc531f70d98ce9045a90f90614761d61b477b5ae01ff1ac` |

As pastas `selecao/` e `conferencia/` foram copiadas inteiras (nenhuma captura passa de 250 kB; `diff -r` sem
diferença). `tela-f/.gitattributes` as marca `-text` para que o checkout não mude os bytes.

## O que foi lido

- O adendo e `construcao-tela-f-fase0-2026-11-26.md` (limites do fonte: shadow DOM, SCSS escopado, orçamento de CSS).
- Os insumos selados acima.
- O método da tela E2 (`tela-e2/metodo.md`, `montar-expostas.mjs`, `montar-exclusoes.mjs`, `ponte-base.mjs`,
  `coviolacoes.mjs`, `conferir-ids-base.mjs`) como precedente.
- Referências, para (b) e (c): `ground-truth-processos-1.1.0.json` inteira (descrições e `_meta` da D, para a
  coviolação); de `ground-truth-solicitacao.json`, `ground-truth-acompanhamento.json` (e a candidata em
  `tela-a2/candidata/`), `ground-truth-vistorias.json`, `ground-truth-processos.json` e
  `ground-truth-cadastro-pais.json`, os ids de `violations[].rules` e `rulesLegado` e as `categories` (vocabulário).
- `scripts/reanalise-nat74/e14-deteccao.ts` › `CLASSE_DA_CATEGORIA`/`classeDaSpec` (o script confere a cópia).
- Base literal `ds-rules/govbr-ds-3.7.0-corpus/normalizacao/rules.jsonl`: **só** `id`, `source.corpusFile`,
  `source.charRange` e `originalText`. `normalizacao/mapa-ids.json`: só `antigo`, `novos`, `originalTextAntigo`.
  Os arquivos do corpus citados pelos candidatos (para localizar o trecho).
- O fonte da rota no worktree `.tmp-eval/pnip-mock-f` (ramo `tela-f` @ `3d02f68`), só leitura, para (a).

## O que não foi lido nem usado

`govbr-ds-validator` (código, verificadores, aliases; de dados, só a exceção autorizada na revisão abaixo: os
arquivos de regra servidos na tag `congelado-3.7.12`, campos id/texto/fonte), `.validator-*`, `checker-aliases.json`, `kb-aliases.json`,
`results/`, `reports/`, `govbr-resultados`, logs de execução (`pipeline/logs/`), ferramentas MCP e CLI do validator,
axe. Da base literal, nenhum campo além dos quatro acima (nem força, estratégia de validação, automatizável,
confiança, evidência esperada, texto normalizado). Nenhum modelo chamado, nenhum workflow disparado.

## Procedimento

1. **Conferente:** reprovado sai, sem conserto (7 de 24).
2. **Filtros**, na ordem do seletor (nível; dentro dele, `ordem`), todos avaliados e gravados com uma linha de razão
   em `filtros.json` (o primeiro que reprova é o `saiEm`):
   - (a) construtível na rota pelo fonte (elemento e linha conferidos no worktree; limites da fase 0; `risco` do
     conferente mantido e marcado);
   - (b) sem coviolação com defeito natural da D 1.1.0 nem com candidato à frente: reprova só "mesmo elemento **e**
     mesma propriedade/regra";
   - (c) nenhum id ligado em (d) aparece nas referências de A, A2, B, D, E (`rules` + `rulesLegado`; id antigo
     resolvido por `mapa-ids.json`, e antigo sem `novos` comparado pelo texto antigo com o trecho citado, como na E2);
     ids `accessibility-global`/`template-global` fora da base e do mapa (19) ficam registrados como não resolvidos —
     não podem coincidir com ids de componente da base;
   - (d) a cláusula citada tem id citável: `mapear-clausulas.mjs` localiza cada parte do trecho (separadas por
     `[…]`) no arquivo citado do corpus e liga todo id da base cuja faixa (`charRange`) no mesmo arquivo se sobrepõe
     a ela (`clausulas-base.json`). Sem id sobreposto, a cláusula não está na base;
   - (e) `categories` decididas no vocabulário das referências (`token`, `tipografia`, `estrutura`, `componente`,
     `comportamento`; `acessibilidade`/`navegacao`/`formulario` só se o observável é propriedade de acessibilidade,
     de formulário ou de navegação, regra da E2 § 5) → `classeDaSpec` tem de dar `ds`.
3. **Composição** (§ 4 item 4): 3 primeiros sobreviventes por nível → semeadas; seguintes → reserva.

## Revisão de 26/11: (d) passa a ser registro, não filtro

O coordenador mudou o adendo (§ 4 item 3, "id na base: registro, não filtro"), vendo só a contagem da primeira
aplicação, sem ver a lista. Nenhum candidato sai por falta de id. A cláusula é procurada na base que o oráculo
congelado serve: `govbr-ds-validator`, tag `congelado-3.7.12` (816f4ba), lida por `git show` (sem checkout, sem
build, sem executar), `data/knowledge/manifest.json` › versão ativa › `ruleFiles` (`normalized/rules.jsonl` com as
emendas, que incluem as unidades de especificação, e `normalized/carried-over.jsonl`), sha256 conferidos contra o
manifesto da versão. De cada registro, só `id`, `originalText`, `source.corpusFile` e `source.charRange`. Nada de
`src/`, verificadores, aliases, força ou detecção. Os arquivos do corpus citados foram conferidos pelo sha256 contra o
corpus da versão servida.

`mapear-clausulas-oraculo.mjs` → `clausulas-oraculo.json`: cada parte do trecho (na ordem do "[…]") é localizada no
arquivo; liga-se o registro do mesmo arquivo com faixa sobreposta cujo texto está contido na parte ou a contém. Sem
registro ligado → `semIdMapeado: true`, com o trecho literal e o arquivo (como as specs sem id da referência 1.1.0 da D).

Filtros (a), (b), (e): os mesmos juízos. (c): ids da base servida; candidato sem id é comparado pela fonte (id de
referência com faixa sobreposta ao trecho, no mesmo arquivo) e pelo texto (spec de referência que traz o trecho);
se não pode ser a mesma regra, passa. O veredito antigo de (d) fica em `filtros.json` como `dAntigo`.

| Nível | candidatos | conferente | (a) | (b) | (c) | (e) | com id | sem id | (dAntigo) |
|---|---|---|---|---|---|---|---|---|---|
| fácil | 6 | 4 | 4 | 4 | 3 | 3 | 3 | 0 | 2 |
| médio | 6 | 5 | 5 | 5 | 5 | 5 | 5 | 0 | 1 |
| difícil | 6 | 4 | 4 | 4 | 4 | 4 | 3 | 1 | 1 |
| muito difícil | 6 | 4 | 4 | 4 | 4 | 4 | 2 | 2 | 1 |

**Composição** (`compor.mjs` → `composicao.json`): 12 semeadas, F-01…F-12, 3 por nível; reserva R-01…R-04 (0/2/1/1).
Semeadas com id na base servida: 3/3/3/2; sem id mapeado: 0/0/0/1. Recomposição do portão (§ 5) já fixada:
saem F-03 e F-06, entram R-03 e R-04. Listas para a construção: `lista-de-mudancas.json` (12) e
`lista-de-mudancas-reserva.json` (4, com `podeSubstituir`), sem nível, cláusula, id de regra nem justificativa.

## Primeira aplicação (regra antiga, histórico)


Sobreviventes por nível depois de cada passo (`filtros.json › _meta.sobreviventesPorNivelDepoisDeCadaFiltro`):

| Nível | candidatos | conferente | (a) | (b) | (c) | (d) | (e) |
|---|---|---|---|---|---|---|---|
| fácil | 6 | 4 | 4 | 4 | 3 | 2 | 2 |
| médio | 6 | 5 | 5 | 5 | 5 | 1 | 1 |
| difícil | 6 | 4 | 4 | 4 | 4 | 1 | 1 |
| muito difícil | 6 | 4 | 4 | 4 | 4 | 1 | 1 |

**Composição parada.** Nenhum nível tem 3 sobreviventes (5 no total; o mínimo do adendo é 10, com 2 por nível).
Pela instrução recebida, não se escreveu `composicao.json` nem as listas de mudanças: este passo para aqui.

**Causa do corte em (d), mecânica e não por candidato:** a base literal (2.971 regras) não carrega as linhas das
tabelas de especificação dos componentes e fundamentos (nenhum `originalText` da base contém nenhum dos tokens
`--…` citados pelos candidatos, e nenhum id tem faixa sobreposta às linhas de tabela citadas). Os 11 candidatos que saem em (d) citam linhas dessas
tabelas; todos os trechos foram achados literais no corpus, só não têm id. Os que sobrevivem citam frases do texto
corrido.

## Próximo passo que a primeira aplicação previa (superado pela revisão)

§ 4 item 4: o seletor é chamado **uma vez** para completar cada nível sem 3 aprovados (faltam 1 no fácil, 2 no
médio, 2 no difícil, 2 no muito difícil). Observação de procedimento para o novo pedido, sem tocar nos critérios: a
cláusula citada precisa ser uma frase do texto corrido da documentação, não uma linha de tabela de especificação, ou
sairá de novo em (d). Os novos candidatos passam pelo conferente e por estes filtros, na mesma ordem, depois dos
atuais sobreviventes do nível; se ainda faltar, vale o mínimo de 10 specs e 2 por nível (§ 4 item 4) ou o
encerramento (§ 7).

## Reprodução

```
node tela-f/mapear-clausulas.mjs          # → clausulas-base.json (regra antiga, dAntigo)
node tela-f/mapear-clausulas-oraculo.mjs  # → clausulas-oraculo.json (registro d)
node tela-f/filtros.mjs                   # → filtros.json
node tela-f/compor.mjs                    # → composicao.json, lista-de-mudancas*.json
```

## Rascunho da referência (26/11, enquanto a construção injeta as mudanças)

Feito sem o build semeado. Nenhum modelo, nenhum oráculo, nenhum axe. A pasta `construcao/` não foi tocada.

- **`ground-truth-processos-f.json` 1.0.0 (RASCUNHO)**, na raiz, montado por `montar-referencia-rascunho.mjs`:
  25 specs.
  - Estrato semeado: F-01…F-12, 20 unidades, todas classe `ds`.
  - Estrato natural: as 13 da D 1.1.0, copiadas sem mudança, 57 unidades.
  - Estrato exposto: D-11…D-14, dentro do natural; `_meta.exposto` é igual a ele.
  - Rota `/pnip-f/...`, `suite: processos-f`.
  - Predicados de aceitação: 11 das 12 semeadas, todos da espécie `estilo-computado`; a F-11 fica sem predicado.
  - A spec sem id fica em `_meta.semIdMapeado` e em `sem-id-mapeado-1.0.0.json`.
- **Estados.** As duas paradas da D ficam intactas no segmento 1. Entram 2 novas no segmento 3, depois de ida e
  volta por navegação (processos → vistorias → processos), porque escolher um filtro recarrega a lista e acrescenta
  uma tag de interação; num segmento só, isso quebraria a aditividade e as contagens da D. A exploração no build sem
  semente (`explorar-estados.mjs` → `explorar-estados.json`) achou:
  - duas opções que mantêm as 9 linhas;
  - a árvore depois da volta igual à de uma entrada direta;
  - 0 erros e 0 chamadas sem fixture.
- **Conferência no build sem semente** (`conferir-referencia-sem-semente-rascunho.log`, entrada temporária
  `processos-f` em `telas.json`, sem commit):
  - nenhum problema de estado, segmento, aditividade ou contagem;
  - as 13 naturais resolvem com as contagens da D;
  - os 11 predicados dão `refuta`, como deve ser sem a semente;
  - a âncora da F-04 só existe no semeado.
- **`niveis-1.0.0.json`** no formato `tela-f-niveis-1.0.0` de `conferirNiveis`, gerado por `niveis.mjs`; o sha256
  é preenchido com `--selar` no congelamento.
- **Critérios de julgamento** (`criterios-de-julgamento-sem-predicado.json`): a F-11 com observável, estado e
  critério; as outras 11 com uma linha cada, porque o predicado não credita.
- **Classes.** `tela-d/classes-d156.ts` roda sobre o rascunho (teste a seco: 12/12 semeadas `ds`). O arquivo
  `classes-d156-1.0.0.json` só é gravado com a referência final.
- **Controles.** 3 dos 12 controles da D têm elemento participante de uma semeada e serão repostos pelo
  procedimento da D (`pendencias-congelamento.md` § 5).
- **O que falta:** `pendencias-congelamento.md`.

## Depois da construção (26/11): parte medível da referência

Feito sem modelo, sem oráculo e sem axe na página F.

- **Construção conferida contra a lista.** As 12 entradas da `lista-de-mudancas.json` estão no diff do fonte
  (pnip-mock 3d02f68..f8905a8, 7 arquivos). A F-11 é a reordenação equivalente. A evidência do construtor
  (`construcao/`) foi commitada sem mudança.
- **`check-reference` no build semeado** (`conferir-referencia-semeada.log`): 0 problemas, 11/11 predicados
  sustentam, 77 unidades, naturais com as contagens da D.
- **Naturais e controles re-medidos com o código da D** (`remedida-d/`) nos dois builds. A evidência das 13
  naturais é idêntica entre os builds: 0 coviolações.
- **Controles:** 10, pelo procedimento da D (`sortear-conformes-f.mjs`).
- **Lacunas do construtor** medidas onde tocam spec (`lacunas-construcao.json`).
- **Ids × base servida:** 12/12, e a F-12 segue sem id.
- **Auditoria cega:** pacote com 24 afirmações (`auditoria-cega/`). O que falta está em `pendencias-congelamento.md`.
