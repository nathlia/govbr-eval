# Classes pré-registradas da tela F3 (protocolo NAT-78 §5.3, NAT-71 §3) — classificações cegas, 27/11/2026

Classificadores novos e cegos, cada um só com `pedido/` (definições NAT-71 §3.1–3.2 e protocolo §5.3, as 12 specs semeadas, os critérios de julgamento como leitura auxiliar), sem ver o outro, sem navegador e sem ferramenta. Regra: 1 e 2 são a dupla classificação; o 3 só desempata onde 1 e 2 discordam (maioria). As 13 naturais herdam a classe final da D (`heranca-naturais.json`). Referência final sha256 `14baee19d40b8818e9d44d2b00b6636b94fbaee5d79cefddedc97307ebfbd7b0`.

| Spec | Classe (1) | Classe (2) | | Nível (1) | Nível (2) | | Final |
|---|---|---|---|---|---|---|---|
| F3-01 | contextual/relacional | contextual/relacional | igual | b | b | igual | contextual/relacional / b |
| F3-02 | layout/visual | sintático | **difere** | a | a | igual | sintático / a |
| F3-03 | contextual/relacional | contextual/relacional | igual | b | b | igual | contextual/relacional / b |
| F3-04 | layout/visual | layout/visual | igual | a | b | **difere** | layout/visual / a |
| F3-05 | layout/visual | layout/visual | igual | a | a | igual | layout/visual / a |
| F3-06 | layout/visual | layout/visual | igual | a | a | igual | layout/visual / a |
| F3-07 | sintático | sintático | igual | a | a | igual | sintático / a |
| F3-08 | layout/visual | layout/visual | igual | a | b | **difere** | layout/visual / a |
| F3-09 | contextual/relacional | contextual/relacional | igual | b | b | igual | contextual/relacional / b |
| F3-10 | layout/visual | layout/visual | igual | a | a | igual | layout/visual / a |
| F3-11 | contextual/relacional | contextual/relacional | igual | a | b | **difere** | contextual/relacional / a |
| F3-12 | semântico | semântico | igual | c | c | igual | semântico / c |

Acordo 1×2: classe 11/12; nível 9/12. Desempates pelo 3: 4. Sem maioria: 0.

## Herdadas

D-01…D-14 (13): classe final da D (`tela-d/classes-nat71/classes-finais.json`); 12 idênticas byte a byte, a D-14 idêntica fora a âncora (mesmo elemento, a mesma troca da F2).
