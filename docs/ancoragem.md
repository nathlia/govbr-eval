# Ancoragem por elemento — a suíte de fluxo (D-23/D-25)

## O problema

A suíte `TC-*` ancora a unidade de avaliação numa **seção**: `TC-B-08` é ao mesmo tempo o recorte
da página, o id que o agente reporta e a chave pela qual o scorer atribui o achado. Isso funciona
porque cada seção contém um espécime e um defeito.

Numa tela de serviço de verdade — a página que o D-23 pede — as seções deixam de existir como
recorte natural, e a ancoragem por seção fica com dois defeitos:

1. **Ela é uma grade de correção.** Uma lista de caixas numeradas diz ao agente onde olhar e
   quantos vereditos emitir. Ele não precisa *encontrar* nada; precisa preencher a grade.
2. **Ela não representa o caso decisivo.** O experimento do D-23 depende de uma violação que
   *todas* as instâncias compartilham — todos os botões com o mesmo raio errado. Numa seção só,
   isso vale **uma** unidade, e o agente acerta dizendo "os botões estão errados" uma vez. O que
   se quer medir é se ele **enumera** as instâncias, porque é exatamente disso que o raciocínio
   relacional é incapaz: comparando cada botão com os irmãos, ele conclui "consistente, portanto
   conforme" e falha em silêncio.

## A solução

A unidade passa a ser **(elemento × regra)**, e o elemento é identificado por uma **chave
canônica** derivada da árvore da página:

```
body>main>form:nth-of-type(2)>div:nth-of-type(3)>button
```

Os dois lados escrevem seletores livremente. O gabarito diz `#dados-pessoais .br-button`; o agente
diz `form > div:nth-child(3) button`. Ambos são resolvidos **no mesmo carregamento da página** e
reduzidos à mesma chave — comparar strings não responderia nada, comparar elementos sim.

Nenhum atributo do elemento entra na chave. Isso é deliberado: se a chave dependesse de um `id` ou
`data-*`, marcar o DOM para permitir a correção viraria requisito, e a tela voltaria a carregar
pista do gabarito (D-02).

### Como o gabarito declara uma violação

```json
{
  "id": "V-03",
  "anchor": "#solicitacao .br-button",
  "except": "#solicitacao .br-button.is-link",
  "scope": "todos",
  "expectedCount": 12,
  "rules": ["ds:token-radius"],
  "categories": ["token"],
  "description": "raio 6px fora da escala do DS, em todos os botões do fluxo"
}
```

- `scope: "unico"` — a âncora tem de resolver para exatamente um elemento.
- `scope: "todos"` — **uma unidade por elemento resolvido**. É assim que a violação compartilhada
  se escreve uma vez e cobra N enumerações.
- `except` — subtrai elementos da resolução da âncora.
- `expectedCount` — quantas instâncias o gabarito **afirma** existir. Quando declarado e a página
  discorda, a pontuação **para** em vez de medir. É o guarda contra editar a tela e esquecer o
  gabarito, na linha do D-06.

Âncora inválida, âncora que não casa com nada, `scope: "unico"` com mais de um elemento e
`expectedCount` desmentido são todos **defeitos do gabarito**: `npm run score:fluxo` sai com erro e
lista cada um. Não existe medição parcial enquanto houver defeito.

### Como o agente reporta

```json
{ "selector": "#solicitacao .br-button", "rule": "ds:token-radius",
  "description": "borderRadius computado 6px — fora da escala 0/4/8/16/pill" }
```

Sem id de caso, sem mapa de vereditos: **não há grade para percorrer**. Recall é unidade esperada
que ninguém casou; precisão é achado que não casou com unidade nenhuma.

**Um seletor que alcança k elementos são k afirmações da mesma regra.** É o que permite reportar a
violação compartilhada de uma vez só — `.br-button` com a regra do raio credita as 12 instâncias —
e é também o que faz um seletor largo demais pagar caro: se ele alcança 40 botões e só 12 têm o
defeito, são 12 acertos e 28 falsos positivos. A conta está certa: foram 28 afirmações erradas
sobre elementos concretos.

Um seletor que não alcança nada (ou é inválido) é cobrado como falso positivo, mas contado à parte
na coluna `sem seletor`, porque "errei o alvo" e "errei o diagnóstico" não são o mesmo erro e a
diferença importa na leitura.

## Comandos

```
cd ../govbr-corpus && npm run dev      # a página precisa estar no ar
npm run ancoras                        # o que cada âncora alcança — auxílio de autoria
npm run ancoras -- --verbose           # sem truncar as listas longas
npm run score:fluxo                    # a medição
npm run score:fluxo -- --verbose       # com FN e sobras, elemento por elemento
```

Execuções arquivadas em `results/runs-fluxo/` (com oráculo) e `results/runs-fluxo-ablacao/`
(sem oráculo). `FLOW_GT=arquivo.json` aponta para outro gabarito; `APP_URL` para outra origem.

## O que esta suíte NÃO faz

- **Não se mistura com a suíte `TC-*` nem com a orgânica.** Outro gabarito, outro diretório, outra
  tabela; os números nunca se somam nem se promediam (D-13).
- **Não herda linha de base da suíte `TC-*`.** `npm run baselines:fluxo` mede axe e eslint sobre
  **esta** página, no mesmo estado que o scorer usa, e atribui cada nó violado pelo axe à mesma
  chave canônica de elemento. Herdar os números da outra suíte seria assumir baseline, que é
  precisamente o que o D-06 proíbe. O eslint fica sem atribuição a elemento: é um linter de código,
  aponta arquivo e linha, e não há mapa honesto para o DOM sem marcar o corpus (D-02) — por isso
  entra como contagem declarada, e não como recall.
- **Não adjudica sozinha.** A semântica de veredito é a mesma do D-21 e o scorer aplica registros
  existentes, mas `npm run adjudicate` ainda só varre os diretórios da suíte `TC-*`. Enquanto
  isso não mudar, as sobras da suíte de fluxo ficam pendentes e a precisão é piso — que é o
  comportamento correto, só não é o cômodo.

## Extração de regra

Vem de `scripts/units.ts`, importada, não reescrita: normalização de id, expansão de aliases da KB
e a leitura de citações no texto livre são as mesmas das duas suítes. O log registra sete
ocorrências do mesmo defeito estrutural — uma dimensão que uma parte do código conhece e a outra
não — e duas respostas para "que norma este achado cita?" seriam a oitava.
