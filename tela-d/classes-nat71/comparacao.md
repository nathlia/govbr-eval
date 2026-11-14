# Classes pré-registradas da tela D (protocolo NAT-78 §5.3, NAT-71 §3) — duas classificações cegas, 14/11/2026

Dois classificadores novos, cada um só com as definições da NAT-71 §3.1–3.3 e as 13 specs da referência `processos` 1.1.0 (sha256 `2eacba80efb373c4923f7f85593c684647e6b5ec58ad5a341329d96a44632569`), sem a proposta do auditor (`_meta.classes`), sem ver o outro, sem navegador e sem ferramenta. Arquivos: `classificador-1.json`, `classificador-2.json`.

**Estado: proposta com desacordos. A classificação final é da autora (§5.3) e ganha sha256 antes do primeiro disparo.**

| Spec | Classe (1) | Classe (2) | | Nível (1) | Nível (2) | |
|---|---|---|---|---|---|---|
| D-01 | sintático | sintático | igual | b | b | igual |
| D-02 | sintático | sintático | igual | b | b | igual |
| D-03 | sintático | sintático | igual | b | b | igual |
| D-04 | contextual/relacional | contextual/relacional | igual | a | b | **difere** |
| D-05 | contextual/relacional | contextual/relacional | igual | b | b | igual |
| D-06 | layout/visual | layout/visual | igual | a | b | **difere** |
| D-07 | contextual/relacional | contextual/relacional | igual | b | b | igual |
| D-08 | sintático | sintático | igual | a | b | **difere** |
| D-10 | contextual/relacional | layout/visual | **difere** | b | b | igual |
| D-11 | contextual/relacional | contextual/relacional | igual | b | b | igual |
| D-12 | contextual/relacional | contextual/relacional | igual | a | b | **difere** |
| D-13 | semântico | semântico | igual | c | c | igual |
| D-14 | layout/visual | layout/visual | igual | a | b | **difere** |

Acordo: classe 12/13; nível de automatizabilidade 8/13.

## Desacordos, para a autora decidir

### D-04 — nível

- Classificador 1 (contextual/relacional, a): Limítrofe com sintático (ausência de aria-label/title no próprio input), mas o nome do controle exige relacionar rótulo↔controle (`<label>`/aria-labelledby), caso que a definição põe em contextual; a regra `label` do axe-core cobre exatamente essa ausência (nível a).
- Classificador 2 (contextual/relacional, b): Exige relacionar rótulo↔controle (ausência de <label> associado, aria-labelledby ou equivalente), caso nomeado como contextual na definição 3.1; predicado determinístico escrevível, sem predicado testado citado (nível b).

### D-06 — nível

- Classificador 1 (layout/visual, a): Contraste insuficiente (WCAG 1.4.3) decidível sobre o estilo computado do elemento num estado, exemplo literal da classe layout/visual; a regra `color-contrast` do axe-core implementa o predicado (nível a).
- Classificador 2 (layout/visual, b): Contraste insuficiente (WCAG 1.4.3) decidível sobre estilo computado de cor de texto e fundo, exemplo explícito de layout/visual; não é "token certo para o contexto" porque a norma cobrada é a razão de contraste; nível b, sem predicado testado citado na spec.

### D-08 — nível

- Classificador 1 (sintático, a): Decidível num único elemento (`<th>` sem texto nem nome acessível); a regra `empty-table-header` do axe-core implementa esse predicado (nível a).
- Classificador 2 (sintático, b): Decidível olhando um elemento (th scope="col" vazio, sem nome); a consequência para as células é relacional, mas a decisão não exige outro elemento, então desempata para sintático; nível b.

### D-10 — classe

- Classificador 1 (contextual/relacional, b): Limítrofe com sintático (iframe sem title) e layout (outline none), mas a referência cobra sobretudo a transição de foco (é ponto de Tab e, focado, nada muda; ciclo iframe↔body), que a definição põe em contextual; só a parte do nome tem regra no axe (`frame-title`), o conjunto é escrevível (nível b).
- Classificador 2 (layout/visual, b): A regra listada primeiro (WCAG 2.4.7) é decidida pelo estilo computado no estado focado (outline none, sem sombra), como A-04; a ausência de title (4.1.2) seria sintática, e escolhi pela parte de foco visível que a descrição mais cobra; nível b.

### D-12 — nível

- Classificador 1 (contextual/relacional, a): Presença/ausência global e hierarquia de títulos na página (nenhum h1 em light DOM e shadow roots), critério de contextual; a regra `page-has-heading-one` do axe-core implementa o predicado (nível a).
- Classificador 2 (contextual/relacional, b): Ausência global de h1 e hierarquia de títulos na página inteira (light DOM e shadow roots), critério de presença/ausência global e hierarquia da classe contextual; nível b.

### D-14 — nível

- Classificador 1 (layout/visual, a): Contraste insuficiente (2,33:1) decidível sobre estilo computado de um elemento num estado, classe layout/visual; a regra `color-contrast` do axe-core implementa o predicado (nível a).
- Classificador 2 (layout/visual, b): Contraste de texto branco sobre #ff8c00 (2,33:1, WCAG 1.4.3) decidível por estilo computado, exemplo explícito de layout/visual; nível b, sem predicado testado citado na spec.

## Leitura do assistente (recomendação, não decisão)

- **Os cinco desacordos de nível (a × b) têm uma causa só.** O classificador 1 contou como nível a as specs cujo predicado tem regra pública nomeada no axe-core; o classificador 2 leu a definição ao pé da letra ("sem predicado testado citado na spec") e deu b. A definição do nível a (NAT-71 §3.2) pede predicado implementado em ferramenta, com positivos e negativos que passam, e dá a regra do axe como exemplo. Recomendação: **nível a nos cinco**, com a ressalva da própria §3.2: nível a diz que o predicado existe numa ferramenta, não que a ferramenta detecta esta spec nesta página; isso é a linha de base medida que responde.
- **O desacordo de classe (uma spec composta)** separa foco visível (estilo no estado focado) de transição de foco (relação entre elementos). Escolha apertada. Recomendação fraca: a classe do classificador 1, porque a descrição da spec cobra mais de um elemento; a alternativa é igualmente defensável.
