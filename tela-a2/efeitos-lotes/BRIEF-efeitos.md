# Declaração de efeitos por variante — tela A2 (NAT-110), lote N

Contexto: a tela A2 ("Acompanhar requerimento", gov.br DS 3.7.0) vai receber 14 defeitos sorteados de regras
elegíveis. Cada regra aceita tem VARIANTES (a mutação concreta que injeta o defeito, descrita em português) e
algumas têm ALTERNATIVAS VÁLIDAS (forma não canônica mas conforme). O revisor (Codex) exigiu que a
compatibilidade entre defeitos seja derivada dos EFEITOS DECLARADOS de cada mutação — que nós/partes da página
ela altera, remove, e que instâncias aninhadas ela atinge — e não só do tipo da regra. Você declara esses
efeitos. Nada é sorteado; nenhuma semente existe; não tente simular sorteio.

## Proibições (validade da medida — obrigatórias)
- NÃO abra: `F:\Dev Nath\TCC\govbr-ds-validator\` (nada), `checker-aliases.json`, `kb-aliases*.json`,
  qualquer pasta `results/` ou `reports/`, `ds-rules/govbr-ds-3.7.0-corpus/normalizacao/`, `ds-rules/0*`,
  a tela D, `C:\Users\Natty Dev\tcc-reserva`. NÃO use ferramentas MCP do govbr-ds-validator.
- NÃO rode `scripts/draw-tela-a2.ts` em nenhum modo. NÃO faça commit. NÃO edite nada fora do seu arquivo de saída.
- Pode ler: o arquivo de entrada do seu lote, `aceitas-todas.json` (todas as 455 regras aceitas, para
  referência), `F:\Dev Nath\TCC\govbr-eval\tela-a2\inventario.json`, `...\tela-a2\efeitos-lotes\VOCABULARIO.json`,
  e o corpus literal `F:\Dev Nath\TCC\ds-rules\govbr-ds-3.7.0-corpus\{componentes,fundamentos-visuais,padroes,guias,emag}`
  se precisar do texto de uma regra.

## Entrada e saída
- Entrada: `SCRATCH/lote-efeitos-N.json` (lista de regras: id, componente, texto, justificativa, instancias,
  variantes[{id, descricao, instancias?}], alternativasValidas[{id, descricao, instancias?}]).
  Uma variante sem `instancias` vale em TODOS os hospedeiros da regra; com `instancias`, só nesses.
- Saída: `F:\Dev Nath\TCC\govbr-eval\tela-a2\efeitos-lotes\lote-N.json`, formato:
```json
{
  "<idRegra>": {
    "variantes": {
      "<idVariante>": { "toca": ["$:fechar"], "remove": [], "cascata": [], "estado": null, "nota": "uma linha" }
    },
    "alternativas": { "<idAlternativa>": { "toca": ["$:celulas", "$:cabecalho"], "remove": [], "cascata": [], "estado": null, "nota": "..." } },
    "acoplamentoSuspeito": [ { "variante": "<idVariante>", "viola": "<idRegraAceita>", "porque": "..." } ]
  }
}
```
- Se os nós diferem por hospedeiro (ex.: regra global com hospedeiros card, tabela e accordion), use
  `{"porHospedeiro": {"crd-resumo": {...efeito...}, "tbl-movimentacoes": {...}}}` no lugar do efeito, com TODOS os
  hospedeiros em que a variante vale.
- `alternativas` e `acoplamentoSuspeito` só quando houver.

## Como declarar
Vocabulário FECHADO em `VOCABULARIO.json` (partes por componente; `$` = o hospedeiro; nós de outras instâncias
por extenso, ex. `swt-aviso-sms:input`, `grupo-avisos:legend`, `pagina:secao-duvidas`). O mapa `contem` diz que
instâncias ficam dentro de cada nó.
- `toca`: TODO nó cujo DOM, atributo, CSS, texto ou comportamento a mutação muda — inclusive fora do
  hospedeiro (ex.: uma regra hospedada no checkbox que muda o input do switch de SMS → `swt-aviso-sms:input`;
  uma variante de estado que muda a aba ativa e os switches → os nós de cada instância). Seja preciso: o
  nó onde a mudança acontece, não a instância inteira por preguiça; mas, na dúvida entre dois nós, ponha os dois
  (sobre-declarar é seguro, sub-declarar não).
- `remove`: nós retirados do DOM ou da árvore de acessibilidade.
- `cascata`: instâncias contidas (pelo mapa `contem`) num nó tocado e que são atingidas pela mudança — estilo
  herdado no contêiner (fonte, cor, tamanho), troca/embrulho do elemento contêiner (ex.: section→div em volta do
  accordion atinge `acc-duvidas`), visibilidade/exibição, ordem de foco. Mudança de atributo sem herança (ex.:
  aria-labelledby no painel) NÃO cascateia. Recarga/redirecionamento da página: `estado` + `cascata: ["*"]`.
- `estado`: `"recarga"` (a página se recarrega sozinha) ou `"navegacao"` (vai para outra página); senão null.
- `nota`: uma linha dizendo o que muda e onde.
- Interação usada só para MEDIR (hover, Tab) não é efeito; o efeito é o que a mutação altera.
- Partes úteis: tooltip `gatilho` = botão de ícone no card; message `fechar` = botão Fechar; select `gatilho` =
  botão que abre a lista; step `marcador` = Tag de concluído da 1ª etapa; tab `painel-2` contém o formulário;
  `pagina:titulo-form` fica dentro de `tab-requerimento:painel-2`; `pagina:titulo-duvidas` e o accordion
  ficam dentro de `pagina:secao-duvidas`.

## Acoplamento suspeito (importante)
Se a variante, COMO DESCRITA, necessariamente viola também OUTRA regra aceita (procure em `aceitas-todas.json`
pelas regras do mesmo hospedeiro e do mesmo assunto), registre em `acoplamentoSuspeito` com o id da outra regra e
o porquê numa frase. Exemplo real: a variante que muda o data-child do switch de SMS faz o checkbox principal
deixar de mostrar o estado intermediário — isso viola também a regra do switch que exige feedback do estado
intermediário. Só casos em que a segunda violação é consequência necessária da mutação descrita, não
possibilidade remota. Não altere as variantes: só declare e sinalize.

## Validação (obrigatória antes de terminar)
`node "F:\Dev Nath\TCC\govbr-eval\tela-a2\efeitos-lotes\validar-lote.mjs" SCRATCH/lote-efeitos-N.json "F:\Dev Nath\TCC\govbr-eval\tela-a2\efeitos-lotes\lote-N.json"`
tem de imprimir `ok`. Corrija até passar.

## Relatório final (≤150 palavras)
Quantas regras, quantas declarações com nós externos ou cascata (liste ids), e a lista de acoplamentos
suspeitos (id da variante → regra violada). Nada mais.
