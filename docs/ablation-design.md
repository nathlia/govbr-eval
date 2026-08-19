# Desenho da ablação (F2) — nota de pesquisa

**Data:** 2026-08-19 · **Status:** proposta, pendente de decisão
**Origem:** o smoke test do braço sem oráculo (`pipeline/logs/2026-08-19T10-24-04-sem-run1.json`)
não conseguiu rodar, e ao investigar por quê apareceu um problema maior que o esperado.

---

## O achado que muda o desenho

**O protocolo é um segundo oráculo.** `skills/evaluate-all/SKILL.md` não descreve apenas *como*
inspecionar o corpus — ele carrega, em tabelas de "violation signal", boa parte das normas do DS:

- a fonte primária é `Rawline`;
- a escala de raio é `{0, 4, 8, 16, 500px+, 50%}`;
- o botão primário vem **depois** do secundário;
- `br-button primary` dentro da área de conteúdo de `br-item` é proibido;
- padding de `br-item` fora da escala de 4/8px é violação;
- truncar rótulo de botão é proibido, truncar descrição secundária é permitido;
- o *skip link* tem de ser o primeiro focável; a migalha atual não é link.

Isso já estava anotado como limitação 3 do piloto ("a pontuação perfeita reflete também a
especificidade do protocolo"), mas a consequência para a ablação só ficou visível agora:

> Se o braço "sem oráculo" ler este protocolo, ele recebe as normas do DS de graça. A ablação
> mediria a diferença entre *ter as regras por MCP* e *ter as mesmas regras por texto* &mdash;
> que não é a pergunta da tese.

E a recíproca, mais desconfortável: **os 100% da execução de 19/08 são atribuíveis em parte ao
protocolo, não ao oráculo.** Uma ablação que removesse só o servidor MCP mostraria pouca
diferença, e a leitura ingênua disso seria "o oráculo não serve para nada" &mdash; conclusão
errada, tirada de um experimento mal desenhado.

---

## Precedentes nos trabalhos já incluídos (Cap. 3)

Três desenhos diferentes, todos no corpus da revisão:

| Trabalho | Desenho da ablação | Resultado |
|---|---|---|
| `@deng2025` | Remove a *augmentação* (requisitos/interface) da entrada; tarefa idêntica | 25,9% → 8,40% (GPT-5); 22,7% → 8,20% (Opus 4.1) |
| `@wang2025sgcr` | **Graduada, quatro condições**: baseline 22% · implícito-só 29% · explícito-só 37% · completo 42% | O caminho explícito domina; o implícito acrescenta cobertura complementar |
| `@rao2024` | Remove as diretrizes escritas por humanos | Validade 24,8% → 66,3% com as diretrizes |

**O precedente que importa é o `@wang2025sgcr`:** ele não fez binário. Separou o caminho
explícito (regras alimentadas) do implícito (descoberta do próprio modelo) porque **os dois
existem e se confundem**. É exatamente a situação aqui, e o C3 do `tcc2-requirements.md` já
define esses dois caminhos como parte da arquitetura.

E `@suh2025feeda11y` dá o aviso sobre a redação do prompt do braço fraco: *few-shot* teve o
**pior** desempenho (0,449 de inacessibilidade contra 0,347 do ingênuo), e prompting amplo de
acessibilidade foi contraproducente &mdash; "over-application of accessibility attributes created
new conflicts". Ou seja, dizer *mais* ao agente sem oráculo pode piorar o resultado dele, o que
tornaria a ablação favorável à hipótese pelo motivo errado.

---

## Desenho adotado: duas condições

O 2×2 foi descartado. Ele existia para medir *quanto* o protocolo contaminado estava ajudando —
pergunta interessante, mas não é a da tese, e custa o dobro. A decisão foi **corrigir o protocolo
em vez de estudá-lo**: o `SKILL.md` foi reescrito sem nenhuma norma do DS (a versão contaminada
fica recuperável em `c3d514a`), e o requisito A6 passou a ser verificado por
`npm run lint:protocol`, que roda no preflight da bateria.

Com um único protocolo limpo, restam duas condições:

| Condição | Servidor MCP do oráculo | Protocolo |
|---|---|---|
| **com** | carregado | o mesmo |
| **sem** | ausente (`--strict-mcp-config`) | o mesmo |

A única diferença entre os braços é o acesso às normas do DS. É este par que sustenta ou derruba
a afirmação de que existe uma classe de violações que só o agente fundamentado no oráculo detecta.

```powershell
.\run-battery.ps1 -Runs 3 -Arm ambos
```

**A execução de 19/08 (40/40) não entra nesta comparação.** Ela usou o protocolo antigo, que
carregava as normas — é citável como "o sistema conforme especificado inicialmente", com a
ressalva registrada, mas não como braço do experimento.

---

## Predição a registrar antes de rodar

`@oyelayo2026` mediu o LLM cru contra o axe em 662 páginas: F1 agregado 0,65, **recall > 0,93 e
precisão ≈ 0,50**. Se isso se reproduzir aqui, a condição D vai encontrar muita coisa e errar
metade.

Consequência para a leitura do resultado: **o diferencial do oráculo não deve aparecer no recall,
e sim na precisão e na atribuição normativa.** O agente sem oráculo tende a "achar" violações que
não são normas do DS &mdash; e não consegue citar identificador de regra `govbr-3.7.0-…`, porque
não tem de onde tirar. O casamento elemento × regra dele vai depender só dos aliases
`wcag:`/`emag:`.

Isso é a tese do problema do oráculo em forma mensurável, e é o que o gate do D-10
(`verify_finding`) existe para impedir. **Registrar esta predição agora**, antes de executar, é o
que separa um resultado de uma racionalização.

Duas limitações da condição D a declarar junto: sem `get_design_tokens` não há `hexLookup`, então
nenhuma checagem de token é possível &mdash; a categoria `token` (8 unidades) fica inalcançável
por construção, não por incompetência. O mesmo vale, em menor grau, para `ds-pattern`.

---

## Custo estimado

O smoke test que não avaliou nada custou **US$ 0,87** em 27 turnos. A execução completa com
oráculo levou 543 s e 60 chamadas. Estimando US$ 1–3 por execução completa:

| Cenário | Execuções | Custo estimado |
|---|---|---|
| Mínimo (com, sem — 3× cada) | 6 | ~US$ 6–18 |
| F3 completo (5× cada) | 10 | ~US$ 10–30 |

---

## Consequência para o C3 (caminho explícito do SGCR)

Vale registrar o que a correção do protocolo custou em termos de arquitetura. O C3 declara um
"caminho explícito" &mdash; regras predefinidas alimentadas ao agente &mdash; e o protocolo
contaminado era, de fato, uma implementação desse caminho: só que escrita à mão, no cliente, e
fora do alcance de qualquer verificação.

O caminho explícito **não foi eliminado, foi realocado**: ele agora vive no oráculo, servido por
`get_ds_rules`, que é onde o A6 sempre disse que deveria estar. A diferença é que agora ele é
mensurável &mdash; desligar o servidor desliga o caminho explícito, o que é exatamente o que a
ablação precisa poder fazer.

Essa é a leitura a levar para a Metodologia: a arquitetura não mudou, a fronteira entre
procedimento e conhecimento é que passou a ser respeitada e verificada.
