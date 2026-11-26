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

`govbr-ds-validator` (qualquer checkout, código ou dado), `.validator-*`, `checker-aliases.json`, `kb-aliases.json`,
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

## Resultado

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

## Próximo passo previsto no adendo (não executado aqui)

§ 4 item 4: o seletor é chamado **uma vez** para completar cada nível sem 3 aprovados (faltam 1 no fácil, 2 no
médio, 2 no difícil, 2 no muito difícil). Observação de procedimento para o novo pedido, sem tocar nos critérios: a
cláusula citada precisa ser uma frase do texto corrido da documentação, não uma linha de tabela de especificação, ou
sairá de novo em (d). Os novos candidatos passam pelo conferente e por estes filtros, na mesma ordem, depois dos
atuais sobreviventes do nível; se ainda faltar, vale o mínimo de 10 specs e 2 por nível (§ 4 item 4) ou o
encerramento (§ 7).

## Reprodução

```
node tela-f/mapear-clausulas.mjs   # → tela-f/clausulas-base.json
node tela-f/filtros.mjs            # → tela-f/filtros.json
```
