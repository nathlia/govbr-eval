# Pacote de revisão — suíte de fluxo (11.9 / D-21)

> Gerado por `npm run pacote:revisao`, lendo as sobras que o scorer produz agora — não
> os stubs arquivados. Escopo: a única execução pontuada sob o instrumento vigente.

- **instrumento:** `fluxo-1.1.0` · **gabarito:** `1.4.0`
- **execução:** agent-2026-09-02T06-21-31-820Z.json · claude-opus-5
- **unidades:** 22 a partir de 9 specs · **sobras pendentes:** 0

**Quem julga.** A tela e o gabarito foram redigidos pelo ASSISTENTE, sob direção da
autora — é o assistente que a regra do 11.9 desqualifica, não ela. A autora nunca
enumerou os defeitos injetados; o que ela tem é exposição pontual às specs que discutiu
nas decisões (V-04 no D-33, V-06 no D-31, V-07 no D-32). Alegação sobre elemento sem spec
e fora dessas: ela julga como revisora independente. Alegação que toque uma spec exposta:
outra pessoa julga, ou o registro carrega `exposicao` declarada. Ver
`docs/adjudicacao.md § Quem pode julgar`.

**Sobre cegueira.** `--blind` esconde o braço, e esta medida tem um único braço: não há
braço a esconder, e dizê-lo é mais honesto que encenar o procedimento. A ordem abaixo é o
hash do achado, o que ao menos evita ordenar por conveniência. Quando existir o par
`com`/`sem` (11.10), o procedimento cego volta a ser obrigatório.

## Vereditos

| veredito | quando | efeito |
|---|---|---|
| `falso-positivo` | não é verdade na página | cobrado da precisão |
| `lacuna-gabarito` | é verdade, e o gabarito nunca catalogou | sai do FP, entra na dívida |
| `vocabulario` | é a unidade abaixo, com nome que o scorer não conhece | casamento adjudicado (**exige `unit`**) |
| `deteccao-correta` | conteúdo certo, citação ou âncora inválida | credita detecção, não `ruleVerifiedTP` (**exige `unit`**) |
| `duplicado` | reformulação de outro achado já casado no mesmo elemento | sai do FP |
| `indeterminado` | revisado e indecidível | **segue cobrado como FP** |
| `composto` | a alegação afirma **mais de um defeito** | decidido por parte em `components` |

**O teste do defeito composto:** *consertar um defeito consertaria o outro?* Se não, são
duas unidades e o veredito é `composto`, com um componente por defeito. A alegação é
cobrada uma única vez se qualquer parte resolver em cobrança. Ver `docs/adjudicacao.md`.

Um veredito sem `rationale` não é aplicado: o scorer o ignora e segue cobrando o FP.
Carimbe também `adjudicatedBy` e `adjudicatedAt` em cada registro julgado, e
`exposicao` quando quem julga já tinha discutido aquela spec (ex.: `"V-07 (D-32)"`).

## Referência — as specs do gabarito

| spec | âncora | regras aceitas | estado | casada nesta execução |
|---|---|---|---|---|
| **V-01** | `.opcao-identificacao` ×4 | `ds:token-spacing` | sempre | sim |
| **V-02** | `#cpf` ×1 | `wcag:1.3.1` · `wcag:3.3.2` · `emag:6.2` | sempre | sim |
| **V-03a** | `#cpf` ×1 | `wcag:3.3.1` | sempre | sim |
| **V-03b** | `.mensagem-erro-cpf` ×1 | `wcag:4.1.3` · `emag:6.6` | apos-submit-vazio (cond.) | sim |
| **V-04** | `.lista-opcoes, .lista-opcoes > .br-item` ×1 | `wcag:1.3.1` · `ds:item-content` | sempre | **não** |
| **V-05** | `.link-opcao` ×4 | `ds:token-focus` · `wcag:2.4.7` · `emag:4.4` | sempre | sim |
| **V-06** | `.barra-superior, .painel-institucional, .cartao-identificacao, .lista-opcoes, .opcao-identificacao` ×8 | `ds:token-color` | sempre | sim |
| **V-08** | `input#cpf.br-input` ×1 | `ds:structure-input-tag` | sempre | sim |
| **V-09** | `.mensagem-erro-cpf` ×1 | `ds:token-color` | apos-submit-vazio (cond.) | **não** |

---

## As 0 alegações pendentes

## Depois de julgar

```
npm run adjudicate      # julgados, pendentes, registros não aplicáveis
npm run score:fluxo     # piso e adjudicado lado a lado
npm run pacote:revisao  # regenera este arquivo a partir das sobras atuais
```

Cada `lacuna-gabarito` vira dívida: escrevê-la no gabarito exige rodar de novo
`npm run baselines:fluxo` (D-06) e incrementar a versão do gabarito (D-31). Toda unidade
acrescentada assim vira FN para execuções que nunca tiveram chance de encontrá-la — o
viés de pooling se relata, não se corrige.
