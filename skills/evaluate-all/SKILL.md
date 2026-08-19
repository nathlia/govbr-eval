# Skill: evaluate-all

Protocolo de avaliação formal do corpus. Diz **onde olhar**, **como capturar evidência** e **como
reportar** &mdash; e nada sobre o que é certo ou errado no gov.br DS.

## A regra que governa este arquivo

Esta é a separação exigida pelo requisito **A6** (`thesis-workspace/tcc2-requirements.md`),
derivada de `@suh2025feeda11y` e de `@anthropic2024mcp`:

> O procedimento carrega **procedimento apenas**. Conhecimento de domínio &mdash; regras, tokens,
> specs &mdash; mora no oráculo, nunca aqui.

Não é organização: é validade experimental. Se este arquivo disser ao agente qual é a fonte
primária do DS, ou qual é a escala de espaçamento, então **ele é um segundo oráculo** e nenhum
experimento consegue mais medir o que o oráculo MCP contribui. A comparação vira "receber a regra
por MCP" contra "receber a mesma regra por texto", que não é a pergunta da pesquisa.

A primeira versão deste protocolo violava isso desde o commit inicial (`4451f1e`): trazia a fonte
primária, a escala de raio, a ordem dos botões e a escala de espaçamento em tabelas de "violation
signal". O defeito só ficou visível quando a ablação foi desenhada. A versão contaminada continua
recuperável em `c3d514a` para fins de procedência do piloto e da execução de 2026-08-19.

## Ao editar

Pergunte de cada frase nova: **"isto diria a um agente sem oráculo algo que ele não teria como
saber sozinho?"** Se sim, não entra &mdash; vai para o oráculo.

Proibidos neste arquivo: valores de token, nomes de fonte do DS, nomes de classe do DS, escalas
numéricas, listas de valores permitidos, e qualquer tabela que mapeie observação → veredito.

`npm run lint:protocol` verifica isso automaticamente e roda no preflight da bateria.

---

## Sua tarefa

A aplicação em `http://localhost:3000` é uma interface construída com o Design System do gov.br.
Algumas seções contêm defeitos de conformidade ou de acessibilidade; outras estão corretas e
servem de referência. Você não sabe quais são quais, e a proporção não é informada.

Percorra todas as seções e, para cada uma, decida se há violação e qual norma foi violada,
**com base no que você observar na página e no que você souber sobre acessibilidade e sobre
design systems.** Se você tiver acesso a ferramentas de consulta a normas, use-as. Se não tiver,
julgue com o seu próprio conhecimento e diga em que norma se baseia.

Julgue com o mesmo rigor as seções que parecerem corretas: sinalizar uma seção conforme é um falso
positivo e conta contra você tanto quanto deixar passar uma violação.

## Contrato de saída

Idêntico ao do `evaluate-all`. Cada caso recebe um objeto de veredito:

```json
{
  "TC-B-01": { "detected": false, "violations_found": [], "notes": "..." },
  "TC-B-02": { "detected": true,  "violations_found": [
    { "rule": "wcag:4.1.2", "description": "..." }
  ], "notes": "..." }
}
```

- `detected: true` → ao menos uma violação encontrada nesta seção
- `detected: false` → nenhuma violação encontrada
- `violations_found` → uma entrada por regra distinta violada (vazio nos casos limpos).
  **Uma entrada por regra** &mdash; não junte duas violações independentes numa só.
- `notes` → raciocínio breve: o que você observou e por que decidiu assim

O campo `rule` de cada achado deve usar o vocabulário de identificadores:

- `govbr-<versão>-…` &mdash; identificador determinístico vindo de uma ferramenta de consulta a
  regras, **quando você tiver acesso a uma**;
- `emag:<seção>` &mdash; recomendação do e-MAG 3.1, e.g. `emag:6.5`; <!-- lint-protocol: ok --> versão da norma no contrato de saída, não critério de violação; idêntico nos dois braços
- `wcag:<critério>` &mdash; critério de sucesso da WCAG, e.g. `wcag:3.3.2`;
- `ds:<regra>` &mdash; regra específica de design system, quando nenhuma das anteriores couber.

Escolha o identificador mais específico que você puder justificar. Se não conseguir atribuir um
identificador com honestidade, descreva a violação mesmo assim e deixe claro na descrição que a
atribuição normativa é incerta &mdash; **não invente um identificador plausível.**

---

## Passos

### 1. Registre o horário de início

Você não tem acesso a shell nesta execução &mdash; é deliberado, e vale para os dois braços. Tire
o horário do navegador:

```js
new Date().toISOString()
```

Guarde o valor: ele vira `cost.startedAt`. A partir daqui, conte todas as chamadas de ferramenta
que você fizer.

Se você tiver ferramentas de consulta a normas disponíveis, carregue agora as referências que
julgar necessárias &mdash; a escolha de o quê carregar é sua e faz parte do que está sendo medido.

### 2. Aba inicial

- `browser_navigate` para `http://localhost:3000`
- `browser_snapshot` &mdash; árvore de acessibilidade completa (nomes, papéis, atributos ARIA,
  associações de rótulo)
- Estilos computados dos elementos interativos, pelos meios que você tiver disponíveis

### 3. Demais abas da aplicação

Para cada aba da barra de navegação (**Formulário**, **Navegação**, **Tabelas**, **Listas**,
**Interativos**):

- `browser_click` no botão da aba, depois `browser_snapshot`
- Quando a decisão depender de valores de estilo, leia os estilos computados da aba **ativa** com
  `browser_evaluate` &mdash; ferramentas que recarregam a página voltam para a aba inicial
- A aba **Interativos** exige interação, não só leitura: veja o passo 5

### 4. Rotas estáticas

Três páginas independentes fora da aplicação. Navegue direto e inspecione o **HTML entregue**
(`document.documentElement.outerHTML`), não apenas a árvore renderizada &mdash; esta família de
casos é de nível de código-fonte:

- `http://localhost:3000/static/atualizacao.html` (TC-S-01)
- `http://localhost:3000/static/confirmacao.html` (TC-S-02)
- `http://localhost:3000/static/protocolo.html` (TC-S-03)

### 5. Aba Orgânico

A aba **Orgânico** monta fragmentos de exemplo do pacote oficial do DS, **um de cada vez** (os
botões seletores no topo montam e desmontam). Para cada um dos 6 botões de fragmento:

- `browser_click` no botão, depois `browser_snapshot`
- Avalie o fragmento montado como qualquer outro caso (o `data-testid` dele é `TC-O-01`…`TC-O-06`)
- **O fato de virem do pacote oficial não os torna conformes.** Julgue-os pelos mesmos critérios
  que você aplicou ao resto.

### 6. Casos que exigem interação (aba Interativos)

Snapshot não basta: componentes cujo comportamento é a questão precisam ser operados. Acione os
controles, tente percorrer por teclado, tente sair do que abrir, e observe se o que a interface
comunica corresponde ao que ela faz. Registre o que você tentou nas `notes`.

### 7. Varredura entre elementos

Depois das verificações por caso, olhe a página como um todo: há relações entre elementos
distantes que só aparecem quando você compara seções entre si. Faça essa passada antes de fechar
os vereditos.

### 8. Monte e salve o veredito

Monte o JSON completo:

```json
{
  "timestamp": "<ISO>",
  "model": "<modelo>",
  "appUrl": "http://localhost:3000",
  "config": { "arm": "<com-oraculo|sem-oraculo>", "label": "protocolo neutro" },
  "cost": {
    "startedAt": "<ISO do passo 1>",
    "finishedAt": "<ISO agora>",
    "wallClockSeconds": 0,
    "toolCalls": 0
  },
  "verdicts": { "TC-B-01": { "...": "..." } }
}
```

O bloco `cost` é obrigatório (F4). O bloco `config` rotula a execução para o scorer, que agrupa
por configuração e nunca agrega grupos diferentes.

Para salvar, **navegue primeiro para `http://localhost:4000`** e faça o `POST` de lá, na mesma
origem &mdash; o endpoint não envia cabeçalhos CORS, então um `fetch` a partir de
`localhost:3000` seria barrado pelo navegador:

```js
fetch("/api/save-agent-results", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(VEREDITO)
}).then(r => r.json())
```

Faça isso **depois** de fechar todos os vereditos: sair de `localhost:3000` descarrega a página.

### 9. Imprima um resumo

Uma linha por caso: id, detectado ou limpo, e a violação em poucas palavras.

---

## Validade

- **Não leia** `ground-truth.json`, `organic-ground-truth.json`, nada em `results/` ou `docs/`,
  nem o fonte da aplicação. Os vereditos têm de vir do que você observou na página em execução.
  O harness bloqueia esses caminhos; se algo passar, a regra continua valendo.
- **Não leia** `skills/evaluate-all/SKILL.md`. Aquele protocolo contém normas do DS, e lê-lo
  invalida a condição experimental que este arquivo existe para criar.
- Se você não tiver acesso a ferramentas de consulta a normas, isso é **deliberado** e faz parte
  da condição sendo medida. Não é um defeito de configuração a ser contornado: siga em frente e
  julgue com o que você sabe.
