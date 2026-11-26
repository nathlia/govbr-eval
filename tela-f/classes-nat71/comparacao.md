# Classes pré-registradas da tela F (protocolo NAT-78 §5.3, NAT-71 §3) — classificações cegas, 26/11/2026

Três classificadores novos e cegos, cada um só com `pedido/` (definições NAT-71 §3.1–3.2 e protocolo §5.3, as 12 specs semeadas, os critérios de julgamento como leitura auxiliar), sem ver os outros, sem navegador e sem ferramenta. Regra: 1 e 2 são a dupla classificação; o 3 só desempata onde 1 e 2 discordam (maioria). As 13 naturais herdam a classe final da D (`heranca-naturais.json`). Referência final sha256 `d32088bfd7ecb44c2bf75de58f95f425047aa0b2180e80dad9fefbec24d5b3e0`.

| Spec | Classe (1) | Classe (2) | | Nível (1) | Nível (2) | | Classe (3) | Nível (3) | Final |
|---|---|---|---|---|---|---|---|---|---|
| F-01 | layout/visual | layout/visual | igual | b | b | igual | — | — | layout/visual / b |
| F-02 | contextual/relacional | layout/visual | **difere** | b | b | igual | layout/visual | b | layout/visual / b |
| F-03 | contextual/relacional | layout/visual | **difere** | b | b | igual | layout/visual | b | layout/visual / b |
| F-04 | layout/visual | layout/visual | igual | b | b | igual | — | — | layout/visual / b |
| F-05 | layout/visual | layout/visual | igual | b | b | igual | — | — | layout/visual / b |
| F-06 | layout/visual | layout/visual | igual | b | b | igual | — | — | layout/visual / b |
| F-07 | layout/visual | layout/visual | igual | b | b | igual | — | — | layout/visual / b |
| F-08 | layout/visual | layout/visual | igual | b | b | igual | — | — | layout/visual / b |
| F-09 | layout/visual | layout/visual | igual | b | b | igual | — | — | layout/visual / b |
| F-10 | layout/visual | layout/visual | igual | b | b | igual | — | — | layout/visual / b |
| F-11 | contextual/relacional | contextual/relacional | igual | b | b | igual | — | — | contextual/relacional / b |
| F-12 | layout/visual | layout/visual | igual | b | b | igual | — | — | layout/visual / b |

Acordo 1×2: classe 10/12; nível 12/12. Desempates pelo 3: 2. Sem maioria: 0.

## Desacordos

### F-02

- Classificador 1 (contextual/relacional, b): Limítrofe entre layout/visual e contextual: a aceitação mede margin-top de um elemento, mas o defeito é a ação interna não centralizada no campo, o que exige relacionar a geometria do botão com a do campo (contêiner↔item, §3.1 Contextual). Predicado geométrico determinístico escrevível (§3.2 b).
- Classificador 2 (layout/visual, b): Entre layout/visual e contextual/relacional: o desalinhamento é geometria do botão relativa ao campo (contêiner↔item), mas a referência cobra um valor de estilo computado num elemento (margin-top -12px), que é espaçamento/geometria (§3.1 Layout/visual). Predicado determinístico escrito, não testado em ferramenta (b).
- Classificador 3 (layout/visual, b): A aceitação mede uma propriedade de um só elemento (margin-top -12px no botão), o que é layout/visual. Fica limítrofe com contextual/relacional porque o defeito descrito é a posição do botão em relação ao campo (centralização vertical entre dois elementos). Predicado determinístico, sem detector testado (b).

### F-03

- Classificador 1 (contextual/relacional, b): Limítrofe entre layout/visual (espaçamento) e contextual: a área de proteção só se decide relacionando a caixa do 'Voltar' com a do seletor 'Página' vizinho (dois elementos, §3.1 Contextual). Interseção de caixas é predicado determinístico escrevível (§3.2 b).
- Classificador 2 (layout/visual, b): Entre layout/visual e contextual/relacional: a sobreposição envolve dois elementos (Voltar e seletor 'Página'), mas o que a referência cobra é o margin-top -20px do contêiner, espaçamento num elemento (§3.1 Layout/visual). Predicado determinístico (b); também escrevível como interseção de caixas.
- Classificador 3 (layout/visual, b): É cobrado o estilo computado do contêiner (margin-top -20px) e a geometria (a caixa do botão sobrepõe outra caixa), o que dá layout/visual pelo espaçamento. Fica limítrofe com contextual/relacional porque a sobreposição só se decide comparando duas caixas (Voltar e seletor 'Página'). Escrevível como teste de interseção, sem detector testado (b).

## Herdadas

D-01…D-14 (13): classe final da D (`tela-d/classes-nat71/classes-finais.json`), por spec idêntica byte a byte.
