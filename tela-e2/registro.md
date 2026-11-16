# Tela E2 — registro da preparação (até o `--validar`, sem selo, sem sorteio, sem construção)

Método: `metodo.md` (commit `214ded2`, sozinho, antes do inventário). Ramo `tela-e`, sem push. Node 25.2.1.
Só contagens aqui; nenhum conteúdo de regra, célula ou defeito.

## Commits

| Passo | Commit |
|---|---|
| 1 método | `214ded2` |
| 2 inventário (iteração 1) | `b87c4c7` |
| 3a universo, passo 1, herança, lotes e critérios (antes de julgar) | `5517bdb` |
| 3b passo 2 julgado + inventário iteração 2 + rejulgamento + duplicatas entre lotes | `74f9eb8` |
| 4 compatibilidade + construtibilidade | `a6af51e` |
| 5 exclusões (ponte de ids, exposição, tentativa real) | `1c2deeb` |
| 6 `--validar` (`validar.json`) e este registro | este commit |

## Inventário

- Iteração 1: 10 instâncias sorteáveis, 10 hospedeiros, 8 tipos de componente (os da rota; `item` só embutido), 3 estados.
- **Iteração 2 (correção de conformidade, não de contagem):** um juiz do passo 2 apontou que um switch gravado por
  Salvar contraria obrigação do próprio switch (efeito imediato). A página conforme não pode violar obrigação por
  desenho. O switch passou a ser configuração de efeito imediato fora do formulário (mesma instância, mesmo número de
  instâncias e hospedeiros). Vocabulário de nós ganhou `pagina:secao-config`. Rejulgadas no lote 9 as 29 unidades do
  switch e as 18 sem componente que o tinham como hospedeiro (47; 11 decisões mudaram). Feita antes de qualquer
  contagem por classe e de qualquer sorteio.
- Nenhuma iteração por folga foi necessária (§ 3.4): a meta foi atingida na primeira contagem.

## Universo e elegibilidade

- Universo: 3.393 unidades, igual ao da A2 unidade a unidade (124 arquivos lidos, MANIFEST sha256 `f211b83f…`).
- Passo 1: força 356, componente fora da tela 1.325, andaime 281 → 1.431 chegam ao passo 2.
- Passo 2: **709 herdadas da A2** (rejeições de motivo intrínseco: força 176, sem medição 116, duplicada 198,
  não normativa 168, conflito 4, escopo 47), **722 julgadas agora** em 8 lotes (272 aceitas na A2, 341 não se aplica,
  22 só andaime, 23 acopladas e 5 duplicadas de alvo fora do passo 2 rejulgadas; 59 do radio, nunca julgadas),
  47 rejulgadas (lote 9), 1 duplicata entre lotes (revisão do coordenador, 10 pares candidatos). Da rota real:
  só a lista de casco; 0 julgamentos por regra (o único motivo de lá é próprio de web component).
- Elegíveis no passo 2: 268 unidades → 485 células (284 DS, 201 G).

## Compatibilidade e construtibilidade

- 529 colocações (célula × variante), 980 pares incompatíveis entre hospedeiros diferentes; 0 com mudança de estado
  da página; 60 tocam nó fora do hospedeiro.
- Core 3.7.0, Chromium headless 1280×900: 13/13 conferências (S0, S1 e S2 alcançáveis pelos gatilhos; Rawline;
  gatilho do select no Tab; switch com texto de estado e `aria-checked`; Fechar da mensagem e reexibição pela ajuda;
  setas no radio; hover e foco de botão; lista). Decisões de construção registradas pela conferência: marcação
  `switch-data` para o texto de estado; `aria-checked` mantido por script da página (como na A2); gatilho do select
  sem `tabindex="-1"` (como na A2); títulos e botões com iniciais maiúsculas.

## Exclusões (células DS / G; hospedeiros; regras)

| Etapa | DS | G | hosp. DS | regras DS | hosp. G | regras G |
|---|---|---|---|---|---|---|
| elegíveis do passo 2 | 284 | 201 | 10 | 175 | 10 | 93 |
| − sem cláusula na base literal | 181 | 178 | 10 | 111 | 10 | 86 |
| − expostas (A, A2, B, D) | 167 | 137 | 10 | 104 | 10 | 70 |
| − tentativa real | 162 | 135 | 10 | 101 | 10 | 69 |

Ids de exposição e da tentativa (75 govbr + 22 e-MAG): 45 na base literal do corpus, 3 por `novos` do mapa de ids,
8 pelo texto antigo do mapa, 17 cobertos pela recomendação do e-MAG citada na mesma spec, 2 do Template Base (fora do
corpus); 0 não resolvidos.

## `--validar` (sem semente)

Cotas efetivas **6 DS + 3 G** (déficit 0), portão DS alcançável, reposição DS 156 (mínimo 2), meta de folga
atingida (162 células DS em 10 hospedeiros, alvo 12 em 8), solução em ordem neutra com 9 sementes, 0 problemas.
Decisão pela regra escrita: **pode sortear** — mas o passo 7 do método manda parar aqui.

## Construção (depois do sorteio `479e730`)

Registro completo em `construcao.md`. Página `govbr-corpus/cadastro-pais.html` (corpus `48d53d7`, ramo `tela-e`).
Conferência sem oráculo e sem axe (`conferir-construcao.mjs` → `conferencia-construcao.{txt,json}`): 9/9 violados
na semeada, 9/9 conformes sem semente, 9/9 isoladas (0 interferências), estados 33/33, pontos conformes 134/134.
Descartes 0, reposições 0: `descartes.json` vazio aplicado por `sortear-sementes.mjs --repor` →
`sementes-vigentes.json` com 9 vigentes (6 DS + 3 G), déficit 0. O sorteio não rodou de novo.
