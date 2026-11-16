# Critérios do passo 2 da tela E2 — para quem julga um lote

Adaptação, para a página da E2, de `tela-a2/passo2-lotes/CRITERIOS.md` (os critérios da A2, fechados). O que muda:
a página, os hospedeiros, e dois campos a mais nas aceitas (`efeitos` de cada variante e `categorias`). Você julga,
uma a uma, unidades candidatas a obrigação tiradas do texto oficial do gov.br DS 3.7.0 e do e-MAG 3.1. O resultado é
insumo congelado de um sorteio de defeitos para um experimento de mestrado. Rigor e consistência importam mais que
velocidade. Escreva em PT-BR.

## Regras invioláveis (cegueira)

- **Não abra:** `F:\Dev Nath\TCC\govbr-ds-validator\` (nada, em nenhum checkout), `F:\Dev Nath\TCC\ds-rules\govbr-ds-3.7.0-corpus\normalizacao\`,
  `ds-rules\0*`, `checker-aliases.json`, `kb-aliases*.json`, qualquer `results\` ou `reports\`, `ground-truth*.json`,
  a pasta `tela-e\` e `tela-d\`. Não leia `tela-a2\sorteio*`, `tela-a2\reconciliacao*`, `tela-a2\auditoria*`, `tela-a2\construcao*`.
- **Não chame** nenhuma ferramenta `govbr-ds-validator` (MCP) nem rode axe ou Playwright. Não faça commit. Escreva **só** o
  arquivo de saída do seu lote.
- Nunca use como motivo (nem na justificativa) falta de detector, de busca, de checker, de oráculo ou de suporte. O
  script recusa as palavras detector, checker, oráculo, oracle, validator, busca, suporte, kb.

## Onde está tudo

- Seu lote: `F:\Dev Nath\TCC\.tmp-eval\eval-e\tela-e2\passo2-lotes\entradas\lote-N.json` (lista de unidades: `id`,
  `componente`, `arquivo`, `secao`, `texto`, `contexto` = bloco inteiro, `antecedente`, `forca` proposta, `marcador`,
  `hospedeirosPossiveis` = as únicas instâncias em que a unidade pode ser hospedada, `a2` = o julgamento que a mesma
  unidade recebeu na tela A2 — outra página, outros hospedeiros; use como referência de leitura, nunca como resposta —,
  e `porque` = por que ela está sendo julgada de novo).
- Texto-fonte, se precisar de mais contexto: `F:\Dev Nath\TCC\ds-rules\govbr-ds-3.7.0-corpus\<arquivo>`.
- Inventário: `F:\Dev Nath\TCC\.tmp-eval\eval-e\tela-e2\inventario.json`; vocabulário de nós:
  `F:\Dev Nath\TCC\.tmp-eval\eval-e\tela-e2\VOCABULARIO.json`.
- Ids das recomendações do e-MAG (para `duplicada`/`equivalenteEmag`): unidades com `marcador: "emag-recomendacao"` em
  `F:\Dev Nath\TCC\.tmp-eval\eval-e\tela-e2\universo.json`.

## A página (o que existe e o que não existe)

"Cadastrar país importador", página interna gov.br (HTML com a marcação oficial do `@govbr-ds/core` 3.7.0, CSS e JS
do DS), janela 1280×900, tema claro, densidade padrão. Três estados: **S0** carga (mensagem informativa no topo,
formulário vazio, lista de países abaixo); **S1** "Salvar país" clicado com o formulário vazio (mensagem de erro do
envio no topo do formulário; `inp-nome-pais`, `sel-continente` e `rad-situacao`, que são obrigatórios, ficam em estado
de erro com mensagem de campo); **S2** lista de opções do select de continente aberta.

Instâncias **sorteáveis** (só estas hospedam defeito):

| id | o que é |
|---|---|
| `btn-limpar` | botão secundário "Limpar campos" na barra de ações do formulário (ao lado de Salvar e Cancelar, que são andaime) |
| `btn-ajuda` | botão circular só com ícone (nome acessível "Ajuda sobre o cadastro"), ao lado do h1; ao ser acionado, volta a mostrar a `msg-orientacao` se ela foi fechada (não navega) |
| `inp-nome-pais` | input de texto, rótulo "Nome do país", obrigatório (erro em S1) |
| `inp-codigo` | input de texto, rótulo "Código do país", opcional, com texto de apoio sobre o formato (3 letras) |
| `sel-continente` | select simples (não múltiplo), obrigatório, com input, botão gatilho, lista e itens internos (6 continentes); erro em S1; lista aberta em S2 |
| `rad-situacao` | grupo de 3 radios com legend "Situação do cadastro" (Habilitado, Suspenso, Em análise), obrigatório; erro em S1 |
| `swt-certificado` | switch de **efeito imediato**, fora do formulário, numa seção "Configuração do serviço" entre o formulário e a lista: rótulo "Emissão automática de certificado sanitário para países habilitados", texto de estado ao lado; ao alternar, a configuração vale na hora (não depende de Salvar) |
| `lst-paises` | lista (br-list) com título "Países cadastrados" e 4 itens (br-item: nome do país e situação em texto), sem links, sem ações, sem seleção |
| `msg-orientacao` | message informativa, uso geral (no topo do conteúdo), com botão Fechar |
| `msg-erro` | message de erro (só em S1), uso direcionado ao envio do formulário, sem botão Fechar |

**Embutidos** (componente de tipo sorteável dentro de outra instância — a unidade do componente pode ser hospedada
nelas, além das instâncias próprias do componente): button → `sel-continente` (gatilho), `msg-orientacao` (Fechar);
input → `sel-continente`; list → `sel-continente`; item → `sel-continente`, `lst-paises`.

**Andaime (sempre conforme, nunca hospeda defeito nem pode ser alterado por variante):** header (com o botão da
usuária logada — signin — e avatar; sem menu), footer, skiplink, breadcrumb, divider entre formulário e lista, a
região `main`, os botões `btn-salvar` (primário, gatilho de S1) e `btn-cancelar` (secundário), e o documento
(`pagina`: title, lang, hierarquia de títulos, regiões). Uma unidade só de nível de página (title, lang, landmarks,
hierarquia de títulos do documento) sem hospedeiro sorteável → `so-andaime`.

**Não existe na tela:** tema escuro, móvel/toque, vídeo/áudio, imagem de conteúdo, links no conteúdo sorteável,
CAPTCHA, select múltiplo, paginação, modal, menu, tabela, abas, accordion, card, tooltip, upload, checkbox, textarea,
data/hora, wizard, steps, tags, carregamento, notificação, empty state, campo de senha, área de texto, ordenação ou
filtro da lista.

## Decisão por unidade

Igual à A2. Para cada unidade, **uma** decisão:

1. **Força pelo contexto** (leia `texto`, `contexto`, `antecedente`). Se, lida no contexto, é recomendação/orientação
   de uso ("Utilize X quando…", "considere", "evite", "prefira", "opte", "procure", "quando possível") → `forca`. Itens
   herdados de uma introdução herdam a força dela.
2. **Aplicabilidade** à página acima e aos `hospedeirosPossiveis`. Não se aplica → `nao-se-aplica` (diga o que falta).
   Só se manifestaria no andaime → `so-andaime`. Outros tamanhos de janela, móvel, toque, breakpoints → `escopo`
   (o contrato é 1280×900; texto ampliado a 200% NÃO é escopo).
3. **Normatividade:** o marcador casou mas a frase não impõe nada (define termo, descreve o DS, exemplo, permissão
   "pode", opcional) → `nao-normativa`.
4. **Verificável na página** por medida pequena (DOM, CSS computado, árvore de acessibilidade, teclas, texto visível).
   Não → `sem-medicao`, só quando nem a rubrica editorial dá caso inequívoco.
5. **Acoplada:** violar exige uma segunda violação (ex.: tirar o componente inteiro), **ou** toda variante possível
   impede alcançar um estado declarado (S1, S2) ou altera o andaime → `acoplada` (diga qual).
6. **Duplicada:** mesmo predicado, condição e observável de outra unidade → `duplicada:<id>` (fica a de id menor em
   ordem de texto). Se diz exatamente o mesmo que uma recomendação do e-MAG 3.1, `duplicada:<id e-MAG>` +
   `equivalenteEmag: "X.Y"`; se diz mais (tecla, estado, classe, token), fica.
7. **Conflito** com outra obrigação aplicável → `conflito`.

**Rubrica editorial (R-ED)**, igual à A2: cláusula de redação é aceita quando há variante cuja violação dois leitores
classificariam igual pelas palavras da cláusula: (a) critério contável; ou (b) caso flagrante e oposto ao texto.
Diga qual (a/b).

## Se aceita

```json
"a2-xxxxxxxxxxxx": {
  "aceita": true,
  "justificativa": "O que a cláusula exige, na página. Medida: o que medir.",
  "instancias": ["hospedeiros em que vale (subconjunto de hospedeirosPossiveis)"],
  "variantes": [{
    "id": "kebab-curto",
    "descricao": "Uma mudança local, concreta (qual elemento, qual valor).",
    "instancias": ["opcional: se só vale em parte dos hospedeiros"],
    "clausula": "trecho literal da unidade que a variante viola",
    "efeitos": { "toca": ["$:campo"], "remove": [], "cascata": [], "estado": null, "nota": "uma linha" }
  }],
  "tipo": "estrutura-classe | visual-token | comportamento",
  "caminhoDeteccao": ["axe | medicao | leitura-da-regra | interacao"],
  "categorias": ["token | tipografia | estrutura | componente | comportamento | acessibilidade | navegacao | formulario"],
  "razaoCategorias": "uma linha",
  "equivalenteEmag": null
}
```

- **Variante:** mudança local, que não force segunda violação, não toque o andaime, mantenha S1 e S2 alcançáveis, e
  viole a cláusula **com as condições dela preservadas**. 1–3 variantes; cada hospedeiro em `instancias` precisa de
  ao menos uma que valha nele. Ids de variante nunca usam nome de classe da página.
- **efeitos** (vocabulário fechado `VOCABULARIO.json`, como os da A2): `toca` = todo nó cujo DOM, atributo, CSS, texto
  ou comportamento a mutação muda (inclusive fora do hospedeiro, por extenso: `pagina:scripts`, `inp-codigo:campo`);
  `remove` = nós retirados do DOM ou da árvore de acessibilidade; `cascata` = instâncias contidas (mapa `contem`) num nó
  tocado e atingidas (estilo herdado, troca do contêiner, visibilidade, ordem de foco); `estado` = `"recarga"`,
  `"navegacao"` ou null; `nota` = uma linha. Se os nós diferem por hospedeiro, use
  `{"porHospedeiro": {"<hospedeiro>": {efeito}, ...}}` com TODOS os hospedeiros da variante. Na dúvida entre dois nós,
  ponha os dois.
- **tipo** e **caminhoDeteccao** a priori, só pelo texto da regra (como na A2).
- **categorias** (classe da célula, regra fixada antes do sorteio; `tela-e2/metodo.md` § 5): unidade do e-MAG
  (`arquivo` começa com `emag/`), de guia geral de acessibilidade (`acessibilidade.md`, `guias/acessibilidade-html.md`,
  `guias/wai-aria.md`) ou com `equivalenteEmag` → tem de incluir `acessibilidade`. Unidade do DS: categoria-base pelo
  tipo (`visual-token` → `token`, ou `tipografia` se o observável é família, tamanho, peso ou altura de linha de texto;
  `estrutura-classe` → `estrutura`, ou `componente` se é parte da anatomia do componente; `comportamento` →
  `comportamento`), **mais** `acessibilidade` se o observável que a variante muda é propriedade de acessibilidade
  (nome, papel, estado ou propriedade acessível, alternativa textual, operação por teclado, foco visível, contraste),
  `formulario` se é rótulo, obrigatoriedade, instrução ou mensagem de erro de campo, `navegacao` se é destino de
  navegação, landmark ou ordem de navegação. Se as variantes diferirem, use a união das categorias delas.

## Se rejeitada

```json
"a2-xxxxxxxxxxxx": { "aceita": false, "motivo": "nao-se-aplica", "justificativa": "Uma linha: o porquê concreto." }
```

Motivos: `forca`, `nao-se-aplica`, `escopo`, `so-andaime`, `nao-normativa`, `sem-medicao`, `acoplada`,
`duplicada:<id>`, `conflito`. Para `duplicada` de e-MAG acrescente `"equivalenteEmag": "X.Y"`.

## Saída e validação

Um único arquivo JSON `{ "<id>": decisão, ... }` com **todas** as unidades do seu lote, em
`F:\Dev Nath\TCC\.tmp-eval\eval-e\tela-e2\passo2-lotes\lote-N.json`. Antes de terminar, rode (Node 25):

`node "F:\Dev Nath\TCC\.tmp-eval\eval-e\tela-e2\passo2-lotes\validar-lote.mjs" N`

e corrija até imprimir `ok`. Relatório final (≤ 80 palavras): contagem por motivo, aceitas, e até 5 ids em que você
hesitou (só o id e uma palavra sobre a dúvida).
