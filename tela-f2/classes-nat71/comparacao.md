# Classes pré-registradas da tela F2 (protocolo NAT-78 §5.3, NAT-71 §3) — classificações cegas, 26/11/2026

Classificadores novos e cegos, cada um só com `pedido/` (definições NAT-71 §3.1–3.2 e protocolo §5.3, as 12 specs semeadas, os critérios de julgamento como leitura auxiliar), sem ver o outro, sem navegador e sem ferramenta. Regra: 1 e 2 são a dupla classificação; o 3 só desempata onde 1 e 2 discordam (maioria). As 13 naturais herdam a classe final da D (`heranca-naturais.json`). Referência final sha256 `0725eb73be600002e7e26c173cd54ec3389416c30e6b089173439fd103f910c9`.

| Spec | Classe (1) | Classe (2) | | Nível (1) | Nível (2) | | Final |
|---|---|---|---|---|---|---|---|
| F2-01 | contextual/relacional | contextual/relacional | igual | b | b | igual | contextual/relacional / b |
| F2-02 | sintático | sintático | igual | b | b | igual | sintático / b |
| F2-03 | sintático | sintático | igual | b | b | igual | sintático / b |
| F2-04 | layout/visual | layout/visual | igual | b | b | igual | layout/visual / b |
| F2-05 | layout/visual | layout/visual | igual | b | b | igual | layout/visual / b |
| F2-06 | layout/visual | layout/visual | igual | b | b | igual | layout/visual / b |
| F2-07 | semântico | semântico | igual | b | b | igual | semântico / b |
| F2-08 | semântico | semântico | igual | b | b | igual | semântico / b |
| F2-09 | semântico | semântico | igual | b | b | igual | semântico / b |
| F2-10 | layout/visual | layout/visual | igual | b | b | igual | layout/visual / b |
| F2-11 | contextual/relacional | contextual/relacional | igual | b | b | igual | contextual/relacional / b |
| F2-12 | layout/visual | layout/visual | igual | b | b | igual | layout/visual / b |

Acordo 1×2: classe 12/12; nível 12/12. Desempates pelo 3: 0. Sem maioria: 0.

## Herdadas

D-01…D-14 (13): classe final da D (`tela-d/classes-nat71/classes-finais.json`); 12 idênticas byte a byte, a D-14 idêntica fora a âncora (mesmo elemento).
