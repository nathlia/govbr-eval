# Medição sem modelo: domínio das specs de rota de registro da tela Vistorias (D-168)

Gravada em 2026-11-04, sobre a referência 1.1.0, antes de qualquer reconta. Não é julgamento e não decide domínio: põe lado a lado o que cada registro de detalhe mostra; a referência 1.1.0 declara o domínio e cita este arquivo pelo sha256.

- Arquivo: `medicao-dominio-2026-11-04.json` (sha256 `55e68c9dc104d03bb70009e55c560e6ded8bc65f3ee915e96aaf287949a8a198`); script `govbr-eval/tela-b/vistorias/medir-dominio.mjs` (sha256 `5a57206b4ba4c15341b4b0f169e1aa3d0a220ace776a5f06683421dfb191aa6e`). Rodado duas vezes: saída idêntica byte a byte.
- Site: `govbr-telas/site/` (88076aec26e9, site-manifest.json sha256 `6b771736b6faa42a42c0b5dd6e7198677f0c61227e71f5b2c2c86b70e2374695`) servido por `govbr-telas/server.mjs` em 127.0.0.1; a árvore `pnip/` conferida arquivo a arquivo contra `govbr-corpus/public/pnip/manifesto.json` (sha256 `eb2d439d128c6ca3bd5bd3a66f33de4dd22e4f15efcf05447c0a0df7a4c44d98`, 190 arquivos, 0 divergentes).
- chromium headless (Playwright, govbr-eval/node_modules); janela 1280×900; entrada `/pnip/portal-mpa/vistorias?mock-perfil=mpa`; carga nova por linha; toda saída da origem abortada. Contraste: WCAG 2.x (luminância relativa), fundo efetivo = composição dos fundos não transparentes dos ancestrais sobre branco.
- Problemas de medida: nenhum (escritas no mock, pedidos externos e erros da página: 0 em todas as cargas).

## 1. Lista: como cada registro foi alcançado

69 linhas nas três abas; cada linha numa carga nova (aba → página → clique no olho, ou no botão "Agendar"/calendário da aba Agendar).

| aba | pág. | linha | embarcação | situação | botão | registro |
|---|---:|---:|---|---|---|---|
| Tramitando | 1 | 1 | Coral Mansa IV | Vistoria agendada | eye | 3028 |
| Tramitando | 1 | 2 | Maresia Nova I | Vistoria agendada | eye | 3027 |
| Tramitando | 1 | 3 | Maré Prateada IV | Vistoria agendada | eye | 3026 |
| Tramitando | 1 | 4 | Âncora Nova V | Vistoria agendada | eye | 3025 |
| Tramitando | 1 | 5 | Pérola Veloz II | Vistoria agendada | eye | 3024 |
| Tramitando | 1 | 6 | Maresia Serena I | Vistoria agendada | eye | 3023 |
| Tramitando | 1 | 7 | Âncora Serena IV | Vistoria agendada | eye | 3022 |
| Tramitando | 1 | 8 | Coral Veloz V | Vistoria agendada | eye | 3021 |
| Tramitando | 1 | 9 | Coral do Norte IV | Vistoria agendada | eye | 3020 |
| Tramitando | 1 | 10 | Albatroz do Sul II | Vistoria agendada | eye | 3019 |
| Tramitando | 2 | 1 | Estrela Clara | Vistoria agendada | eye | 3018 |
| Tramitando | 2 | 2 | Aurora Nova III | Vistoria agendada | eye | 3017 |
| Tramitando | 2 | 3 | Sereia Nova | Vistoria agendada | eye | 3016 |
| Tramitando | 2 | 4 | Sereia Nova V | Vistoria agendada | eye | 3015 |
| Tramitando | 2 | 5 | Pérola Nova | Vistoria agendada | eye | 3014 |
| Tramitando | 2 | 6 | Maré Nova I | Vistoria agendada | eye | 3013 |
| Tramitando | 2 | 7 | Aurora Veloz | Não comparecimento | eye | 3046 |
| Tramitando | 2 | 8 | Aurora do Norte III | Vistoria preenchida | eye | 3038 |
| Tramitando | 2 | 9 | Âncora do Norte I | Vistoria preenchida | eye | 3037 |
| Tramitando | 2 | 10 | Âncora Prateada V | Não comparecimento | eye | 3045 |
| Tramitando | 3 | 1 | Pérola Nova III | Vistoria preenchida | eye | 3036 |
| Tramitando | 3 | 2 | Pérola do Sul | Vistoria preenchida | eye | 3035 |
| Tramitando | 3 | 3 | Estrela Dourada V | Vistoria preenchida | eye | 3034 |
| Tramitando | 3 | 4 | Brisa Clara | Não comparecimento | eye | 3044 |
| Tramitando | 3 | 5 | Brisa Mansa I | Vistoria preenchida | eye | 3033 |
| Tramitando | 3 | 6 | Maresia do Norte | Vistoria preenchida | eye | 3032 |
| Tramitando | 3 | 7 | Gaivota Dourada IV | Não comparecimento | eye | 3043 |
| Tramitando | 3 | 8 | Maresia Serena II | Vistoria preenchida | eye | 3031 |
| Tramitando | 3 | 9 | Sereia Azul IV | Vistoria preenchida | eye | 3030 |
| Tramitando | 3 | 10 | Maresia Prateada | Vistoria preenchida | eye | 3029 |
| Tramitando | 4 | 1 | Maresia Clara I | Não comparecimento | eye | 3042 |
| Tramitando | 4 | 2 | Aurora do Sul I | Não comparecimento | eye | 3041 |
| Tramitando | 4 | 3 | Estrela Veloz IV | Não comparecimento | eye | 3040 |
| Tramitando | 4 | 4 | Brisa Prateada | Não comparecimento | eye | 3039 |
| Agendar | 1 | 1 | Aurora Dourada V | Vistoria pré agendada | calendar | 3012 |
| Agendar | 1 | 2 | Coral Prateada II | Vistoria pré agendada | calendar | 3011 |
| Agendar | 1 | 3 | Estrela Prateada IV | Vistoria pré agendada | calendar | 3010 |
| Agendar | 1 | 4 | Maresia Mansa | Vistoria pré agendada | calendar | 3009 |
| Agendar | 1 | 5 | Aurora Prateada I | Vistoria pré agendada | calendar | 3008 |
| Agendar | 1 | 6 | Âncora Dourada | Vistoria pré agendada | calendar | 3007 |
| Agendar | 1 | 7 | Pérola Veloz V | Vistoria pré agendada | calendar | 3006 |
| Agendar | 1 | 8 | Aurora Nova | Vistoria pré agendada | calendar | 3005 |
| Agendar | 1 | 9 | Âncora Clara I | Vistoria pré agendada | calendar | 3004 |
| Agendar | 1 | 10 | Onda Veloz III | Vistoria pré agendada | calendar | 3003 |
| Agendar | 2 | 1 | Maresia do Norte III | Vistoria pré agendada | calendar | 3002 |
| Agendar | 2 | 2 | Aurora Veloz | Vistoria pré agendada | calendar | 3001 |
| Concluídos | 1 | 1 | Pérola Veloz II | NAO COMPARECIMENTO | eye | 3069 |
| Concluídos | 1 | 2 | Maresia Serena I | NAO COMPARECIMENTO | eye | 3068 |
| Concluídos | 1 | 3 | Âncora Serena IV | NAO COMPARECIMENTO | eye | 3067 |
| Concluídos | 1 | 4 | Coral Veloz V | NAO ADEQUADA | eye | 3066 |
| Concluídos | 1 | 5 | Coral do Norte IV | NAO ADEQUADA | eye | 3065 |
| Concluídos | 1 | 6 | Albatroz do Sul II | NAO ADEQUADA | eye | 3064 |
| Concluídos | 1 | 7 | Estrela Clara | NAO ADEQUADA | eye | 3063 |
| Concluídos | 1 | 8 | Aurora Nova III | NAO ADEQUADA | eye | 3062 |
| Concluídos | 1 | 9 | Sereia Nova | NAO ADEQUADA | eye | 3061 |
| Concluídos | 1 | 10 | Sereia Nova V | ADEQUADA | eye | 3060 |
| Concluídos | 2 | 1 | Pérola Nova | ADEQUADA | eye | 3059 |
| Concluídos | 2 | 2 | Maré Nova I | ADEQUADA | eye | 3058 |
| Concluídos | 2 | 3 | Aurora Dourada V | ADEQUADA | eye | 3057 |
| Concluídos | 2 | 4 | Coral Prateada II | ADEQUADA | eye | 3056 |
| Concluídos | 2 | 5 | Estrela Prateada IV | ADEQUADA | eye | 3055 |
| Concluídos | 2 | 6 | Maresia Mansa | ADEQUADA | eye | 3054 |
| Concluídos | 2 | 7 | Aurora Prateada I | ADEQUADA | eye | 3053 |
| Concluídos | 2 | 8 | Âncora Dourada | ADEQUADA | eye | 3052 |
| Concluídos | 2 | 9 | Pérola Veloz V | ADEQUADA | eye | 3051 |
| Concluídos | 2 | 10 | Aurora Nova | ADEQUADA | eye | 3050 |
| Concluídos | 3 | 1 | Âncora Clara I | ADEQUADA | eye | 3049 |
| Concluídos | 3 | 2 | Onda Veloz III | ADEQUADA | eye | 3048 |
| Concluídos | 3 | 3 | Maresia do Norte III | ADEQUADA | eye | 3047 |

## 2. Detalhe de cada registro (na carga da linha, depois do clique)

| registro | aba / situação | títulos (B-21) | textarea do detalhe (B-20) | tabelas do detalhe (B-22) | `.bg-secondary-06 > .text-secondary-01` (B-23) | modal "Trocar embarcação" (B-24, B-27) |
|---|---|---|---|---|---|---|
| 3001 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3002 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3003 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3004 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3005 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3006 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3007 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3008 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3009 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3010 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3011 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3012 | Agendar / Vistoria pré agendada | detalhe: h3 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | — | — |
| 3013 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3014 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3015 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3016 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3017 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3018 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3019 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3020 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3021 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3022 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3023 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3024 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3025 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3026 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3027 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3028 | Tramitando / Vistoria agendada | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | — | "Aguarda preenchimento" (seção Vistoria) #ffffff/#888888 3.54:1 14px / 400 | — |
| 3029 | Tramitando / Vistoria preenchida | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | oculta, id —, labels 0, label irmão —, nome AX "?" | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "0%" (seção Conclusão) #ffffff/#888888 3.54:1 14px / 400 | 1 .br-modal (em pnip-propesc-trocar-embarcacao, role —, aria-modal —, aria-label —, aria-labelledby —); dialog na árvore 0; Tab 30 teclas: 7 dentro, 23 fora |
| 3030 | Tramitando / Vistoria preenchida | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | oculta, id —, labels 0, label irmão —, nome AX "?" | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "0%" (seção Conclusão) #ffffff/#888888 3.54:1 14px / 400 | 1 .br-modal (em pnip-propesc-trocar-embarcacao, role —, aria-modal —, aria-label —, aria-labelledby —); dialog na árvore 0; Tab 30 teclas: 7 dentro, 23 fora |
| 3031 | Tramitando / Vistoria preenchida | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | oculta, id —, labels 0, label irmão —, nome AX "?" | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "60%" (seção Envio de documentação) #ffffff/#888888 3.54:1 14px / 400; "0%" (seção Conclusão) #ffffff/#888888 3.54:1 14px / 400 | 1 .br-modal (em pnip-propesc-trocar-embarcacao, role —, aria-modal —, aria-label —, aria-labelledby —); dialog na árvore 0; Tab 30 teclas: 7 dentro, 23 fora |
| 3032 | Tramitando / Vistoria preenchida | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | oculta, id —, labels 0, label irmão —, nome AX "?" | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "0%" (seção Conclusão) #ffffff/#888888 3.54:1 14px / 400 | 1 .br-modal (em pnip-propesc-trocar-embarcacao, role —, aria-modal —, aria-label —, aria-labelledby —); dialog na árvore 0; Tab 30 teclas: 7 dentro, 23 fora |
| 3033 | Tramitando / Vistoria preenchida | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | oculta, id —, labels 0, label irmão —, nome AX "?" | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "0%" (seção Conclusão) #ffffff/#888888 3.54:1 14px / 400 | 1 .br-modal (em pnip-propesc-trocar-embarcacao, role —, aria-modal —, aria-label —, aria-labelledby —); dialog na árvore 0; Tab 30 teclas: 7 dentro, 23 fora |
| 3034 | Tramitando / Vistoria preenchida | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | oculta, id —, labels 0, label irmão —, nome AX "?" | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "60%" (seção Envio de documentação) #ffffff/#888888 3.54:1 14px / 400; "0%" (seção Conclusão) #ffffff/#888888 3.54:1 14px / 400 | 1 .br-modal (em pnip-propesc-trocar-embarcacao, role —, aria-modal —, aria-label —, aria-labelledby —); dialog na árvore 0; Tab 30 teclas: 7 dentro, 23 fora |
| 3035 | Tramitando / Vistoria preenchida | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | oculta, id —, labels 0, label irmão —, nome AX "?" | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "0%" (seção Conclusão) #ffffff/#888888 3.54:1 14px / 400 | 1 .br-modal (em pnip-propesc-trocar-embarcacao, role —, aria-modal —, aria-label —, aria-labelledby —); dialog na árvore 0; Tab 30 teclas: 7 dentro, 23 fora |
| 3036 | Tramitando / Vistoria preenchida | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | oculta, id —, labels 0, label irmão —, nome AX "?" | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "0%" (seção Conclusão) #ffffff/#888888 3.54:1 14px / 400 | 1 .br-modal (em pnip-propesc-trocar-embarcacao, role —, aria-modal —, aria-label —, aria-labelledby —); dialog na árvore 0; Tab 30 teclas: 7 dentro, 23 fora |
| 3037 | Tramitando / Vistoria preenchida | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | oculta, id —, labels 0, label irmão —, nome AX "?" | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "60%" (seção Envio de documentação) #ffffff/#888888 3.54:1 14px / 400; "0%" (seção Conclusão) #ffffff/#888888 3.54:1 14px / 400 | 1 .br-modal (em pnip-propesc-trocar-embarcacao, role —, aria-modal —, aria-label —, aria-labelledby —); dialog na árvore 0; Tab 30 teclas: 7 dentro, 23 fora |
| 3038 | Tramitando / Vistoria preenchida | detalhe: h3 h4 h4 h4 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | oculta, id —, labels 0, label irmão —, nome AX "?" | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX "" | "0%" (seção Conclusão) #ffffff/#888888 3.54:1 14px / 400 | 1 .br-modal (em pnip-propesc-trocar-embarcacao, role —, aria-modal —, aria-label —, aria-labelledby —); dialog na árvore 0; Tab 30 teclas: 7 dentro, 23 fora |
| 3039 | Tramitando / Não comparecimento | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | visível, id —, labels 0, label irmão "Descrever o motivo do não comparecimento" for=—, nome AX "" | — | — | — |
| 3040 | Tramitando / Não comparecimento | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | visível, id —, labels 0, label irmão "Descrever o motivo do não comparecimento" for=—, nome AX "" | — | — | — |
| 3041 | Tramitando / Não comparecimento | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | visível, id —, labels 0, label irmão "Descrever o motivo do não comparecimento" for=—, nome AX "" | — | — | — |
| 3042 | Tramitando / Não comparecimento | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | visível, id —, labels 0, label irmão "Descrever o motivo do não comparecimento" for=—, nome AX "" | — | — | — |
| 3043 | Tramitando / Não comparecimento | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | visível, id —, labels 0, label irmão "Descrever o motivo do não comparecimento" for=—, nome AX "" | — | — | — |
| 3044 | Tramitando / Não comparecimento | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | visível, id —, labels 0, label irmão "Descrever o motivo do não comparecimento" for=—, nome AX "" | — | — | — |
| 3045 | Tramitando / Não comparecimento | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | visível, id —, labels 0, label irmão "Descrever o motivo do não comparecimento" for=—, nome AX "" | — | — | — |
| 3046 | Tramitando / Não comparecimento | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | visível, id —, labels 0, label irmão "Descrever o motivo do não comparecimento" for=—, nome AX "" | — | — | — |
| 3047 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3048 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3049 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3050 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3051 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3052 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3053 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3054 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3055 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3056 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3057 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3058 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3059 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3060 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3061 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3062 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3063 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3064 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3065 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3066 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3067 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3068 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |
| 3069 | Concluídos / Concluído | detalhe: h3 h4 h4 h4 h4 h4 h4 (1º "Programa Nacional de Regularização de Embarcação de Pesca") | — | após h4 "Dados da Notificação" [Status, Data, Hora], caption —, aria-label —, aria-labelledby —, nome AX ""; após h4 "Dados da Notificação" [Data, Solicitante, Vistoriador, Status, Laudo, Protocolo, Arquivos], caption —, aria-label —, aria-labelledby —, nome AX "" | — | — |

## 3. Modal (carga nova, navigate por path ao registro, clique em "Trocar embarcação da vistoria")

Registros com o botão: 3038, 3037, 3036, 3035, 3034, 3033, 3032, 3031, 3030, 3029. Os demais registros não têm o botão (`trocarEmbarcacao` = 0 na medição do detalhe).

## 4. Filtro Cidade (para ler receitas "filtro Cidade > X, linha N")

Carga nova por aba e opção: aba → etiqueta "Cidade" → opção; cada linha filtrada ligada ao registro pela linha igual (todas as células menos o número de ordem) da lista sem filtro da mesma aba.

| aba | cidade | pág. | linha | embarcação | registro |
|---|---|---:|---:|---|---|
| Tramitando | Areia Branca do Leste | 1 | 1 | Maré Prateada IV | 3026 |
| Tramitando | Areia Branca do Leste | 1 | 2 | Coral do Norte IV | 3020 |
| Tramitando | Areia Branca do Leste | 1 | 3 | Pérola Nova | 3014 |
| Tramitando | Areia Branca do Leste | 1 | 4 | Aurora do Norte III | 3038 |
| Tramitando | Areia Branca do Leste | 1 | 5 | Brisa Clara | 3044 |
| Tramitando | Areia Branca do Leste | 1 | 6 | Maresia do Norte | 3032 |
| Tramitando | Barra Nova | 1 | 1 | Âncora Nova V | 3025 |
| Tramitando | Barra Nova | 1 | 2 | Albatroz do Sul II | 3019 |
| Tramitando | Barra Nova | 1 | 3 | Maré Nova I | 3013 |
| Tramitando | Barra Nova | 1 | 4 | Âncora do Norte I | 3037 |
| Tramitando | Barra Nova | 1 | 5 | Gaivota Dourada IV | 3043 |
| Tramitando | Barra Nova | 1 | 6 | Maresia Serena II | 3031 |
| Tramitando | Enseada Clara | 1 | 1 | Pérola Veloz II | 3024 |
| Tramitando | Enseada Clara | 1 | 2 | Estrela Clara | 3018 |
| Tramitando | Enseada Clara | 1 | 3 | Pérola Nova III | 3036 |
| Tramitando | Enseada Clara | 1 | 4 | Sereia Azul IV | 3030 |
| Tramitando | Enseada Clara | 1 | 5 | Maresia Clara I | 3042 |
| Tramitando | Lagoa das Garças | 1 | 1 | Maresia Nova I | 3027 |
| Tramitando | Lagoa das Garças | 1 | 2 | Coral Veloz V | 3021 |
| Tramitando | Lagoa das Garças | 1 | 3 | Sereia Nova V | 3015 |
| Tramitando | Lagoa das Garças | 1 | 4 | Âncora Prateada V | 3045 |
| Tramitando | Lagoa das Garças | 1 | 5 | Brisa Mansa I | 3033 |
| Tramitando | Lagoa das Garças | 1 | 6 | Brisa Prateada | 3039 |
| Tramitando | Porto Sereno | 1 | 1 | Maresia Serena I | 3023 |
| Tramitando | Porto Sereno | 1 | 2 | Aurora Nova III | 3017 |
| Tramitando | Porto Sereno | 1 | 3 | Pérola do Sul | 3035 |
| Tramitando | Porto Sereno | 1 | 4 | Maresia Prateada | 3029 |
| Tramitando | Porto Sereno | 1 | 5 | Aurora do Sul I | 3041 |
| Tramitando | Vila do Farol | 1 | 1 | Coral Mansa IV | 3028 |
| Tramitando | Vila do Farol | 1 | 2 | Âncora Serena IV | 3022 |
| Tramitando | Vila do Farol | 1 | 3 | Sereia Nova | 3016 |
| Tramitando | Vila do Farol | 1 | 4 | Aurora Veloz | 3046 |
| Tramitando | Vila do Farol | 1 | 5 | Estrela Dourada V | 3034 |
| Tramitando | Vila do Farol | 1 | 6 | Estrela Veloz IV | 3040 |
| Agendar | Areia Branca do Leste | 1 | 1 | Aurora Prateada I | 3008 |
| Agendar | Areia Branca do Leste | 1 | 2 | Maresia do Norte III | 3002 |
| Agendar | Barra Nova | 1 | 1 | Âncora Dourada | 3007 |
| Agendar | Barra Nova | 1 | 2 | Aurora Veloz | 3001 |
| Agendar | Enseada Clara | 1 | 1 | Aurora Dourada V | 3012 |
| Agendar | Enseada Clara | 1 | 2 | Pérola Veloz V | 3006 |
| Agendar | Lagoa das Garças | 1 | 1 | Maresia Mansa | 3009 |
| Agendar | Lagoa das Garças | 1 | 2 | Onda Veloz III | 3003 |
| Agendar | Porto Sereno | 1 | 1 | Coral Prateada II | 3011 |
| Agendar | Porto Sereno | 1 | 2 | Aurora Nova | 3005 |
| Agendar | Vila do Farol | 1 | 1 | Estrela Prateada IV | 3010 |
| Agendar | Vila do Farol | 1 | 2 | Âncora Clara I | 3004 |
| Concluídos | Areia Branca do Leste | 1 | 1 | Maresia Serena I | 3068 |
| Concluídos | Areia Branca do Leste | 1 | 2 | Aurora Nova III | 3062 |
| Concluídos | Areia Branca do Leste | 1 | 3 | Coral Prateada II | 3056 |
| Concluídos | Areia Branca do Leste | 1 | 4 | Aurora Nova | 3050 |
| Concluídos | Barra Nova | 1 | 1 | Âncora Serena IV | 3067 |
| Concluídos | Barra Nova | 1 | 2 | Sereia Nova | 3061 |
| Concluídos | Barra Nova | 1 | 3 | Estrela Prateada IV | 3055 |
| Concluídos | Barra Nova | 1 | 4 | Âncora Clara I | 3049 |
| Concluídos | Enseada Clara | 1 | 1 | Coral Veloz V | 3066 |
| Concluídos | Enseada Clara | 1 | 2 | Sereia Nova V | 3060 |
| Concluídos | Enseada Clara | 1 | 3 | Maresia Mansa | 3054 |
| Concluídos | Enseada Clara | 1 | 4 | Onda Veloz III | 3048 |
| Concluídos | Lagoa das Garças | 1 | 1 | Pérola Veloz II | 3069 |
| Concluídos | Lagoa das Garças | 1 | 2 | Estrela Clara | 3063 |
| Concluídos | Lagoa das Garças | 1 | 3 | Aurora Dourada V | 3057 |
| Concluídos | Lagoa das Garças | 1 | 4 | Pérola Veloz V | 3051 |
| Concluídos | Porto Sereno | 1 | 1 | Coral do Norte IV | 3065 |
| Concluídos | Porto Sereno | 1 | 2 | Pérola Nova | 3059 |
| Concluídos | Porto Sereno | 1 | 3 | Aurora Prateada I | 3053 |
| Concluídos | Porto Sereno | 1 | 4 | Maresia do Norte III | 3047 |
| Concluídos | Vila do Farol | 1 | 1 | Albatroz do Sul II | 3064 |
| Concluídos | Vila do Farol | 1 | 2 | Maré Nova I | 3058 |
| Concluídos | Vila do Farol | 1 | 3 | Âncora Dourada | 3052 |
