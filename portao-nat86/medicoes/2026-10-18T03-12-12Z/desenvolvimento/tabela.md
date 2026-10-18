# Portão NAT-86 — desenvolvimento (2026-10-18T03-12-12Z)

matriz d35b33f5aeee08031666da18c78c71d930b82cfecdfaf8289da2f4583ae6822e · validator 2.13.0

| família | D1 por linha | D1 por célula | D2 por linha |
|---|---|---|---|
| F1 | {"TP":9,"fora-do-escopo":2,"TN":25,"preservado":5,"FP":2} | {"TP":5,"fora-do-escopo":1,"TN":13,"preservado":3,"FP":1} | {"-":11,"TN":28} |
| F2 | {"TP":7,"TN":14,"preservado":3} | {"TP":6,"TN":14,"preservado":3} | {"TP":7,"TN":16} |
| F3 | {"TP":7,"preservado":4,"TN":12,"nao-exercitado":4} | {"TP":7,"preservado":4,"TN":12,"nao-exercitado":3} | {"-":7,"TN":18} |
| F4 | {"fora-do-escopo":6,"TN":9,"nao-exercitado":3,"preservado":2} | {"fora-do-escopo":5,"TN":8,"nao-exercitado":3,"preservado":2} | {"-":6,"TN":14} |
| F5 | {"fora-do-escopo":6,"TN":17,"preservado":1} | {"fora-do-escopo":3,"TN":8,"preservado":1} | {"-":6,"TN":18} |
| F6 | {"fora-do-escopo":3,"TN":6} | {"fora-do-escopo":2,"TN":4} | {"-":3,"TN":6} |
| F7 | {"nao-exercitado":1,"TN":11,"fora-do-escopo":3} | {"nao-exercitado":1,"TN":5,"fora-do-escopo":1} | {"TN":12,"-":3} |
| F8 | {"fora-do-escopo":1,"TN":2,"nao-exercitado":2} | {"fora-do-escopo":1,"TN":2,"nao-exercitado":2} | {"-":1,"TN":4} |
| T | {"fora-do-escopo":4} | {"fora-do-escopo":4} | {"-":4} |
| total | {"TP":23,"fora-do-escopo":25,"TN":96,"preservado":15,"FP":2,"nao-exercitado":10} | {"TP":18,"fora-do-escopo":17,"TN":66,"preservado":13,"FP":1,"nao-exercitado":9} | {"-":41,"TN":116,"TP":7} |

**NO-GO** — 2 linha(s) com falso positivo (bloqueia)
exercitadas (D1, linhas com alegação): {"confirmar":{"exercitadas":23,"total":23},"nao-confirmar":{"exercitadas":98,"total":99},"so-unverifiable":{"exercitadas":15,"total":24}}

bloqueantes: 2 · falhas de aceite: 0
- BLOQUEIA D|F1-10-N|0|wcag:3.3.1 D1=FP D2=TN
- BLOQUEIA D|F1-10-N|0|emag:6.6 D1=FP D2=TN
