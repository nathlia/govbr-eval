# Segunda classificação DS / G por célula — tela E2

Você classifica, célula a célula, a **classe** de um defeito que poderá ser semeado numa página de teste construída
com o gov.br Design System 3.7.0. Cada célula = uma obrigação (texto do DS ou do e-MAG 3.1) × um hospedeiro (instância
da página) × as variantes (a mutação concreta que violaria a obrigação naquele hospedeiro). Escreva em PT-BR.

## Cegueira

- Não abra: `F:\Dev Nath\TCC\govbr-ds-validator\` (nada), `ds-rules\govbr-ds-3.7.0-corpus\normalizacao\`, `ds-rules\0*`,
  `checker-aliases.json`, `kb-aliases*.json`, `results\`, `reports\`, `ground-truth*.json`, `tela-e\`, `tela-d\`,
  e em `tela-e2\` **nada** além do seu lote, deste arquivo, `inventario.json` e `VOCABULARIO.json` (em especial NÃO
  abra `tela-e2\elegibilidade*.json`, `tela-e2\passo2-lotes\`, `tela-e2\sorteio*`). Não chame ferramenta MCP do
  validator, não rode axe nem Playwright, não faça commit. Escreva só o seu arquivo de saída.
- Texto-fonte, se precisar: `F:\Dev Nath\TCC\ds-rules\govbr-ds-3.7.0-corpus\<arquivo>`.

## A regra da classe (a mesma da referência da A2; fixa)

Atribua à célula `categorias` do vocabulário {token, tipografia, estrutura, componente, comportamento, acessibilidade,
navegacao, formulario}. A classe é **DS** só se TODAS as categorias forem de {token, tipografia, estrutura, componente,
comportamento}; se houver `acessibilidade`, `navegacao` ou `formulario`, a classe é **G**.

1. Unidade do e-MAG (`arquivo` começa com `emag/`) ou de guia geral de acessibilidade (`acessibilidade.md`,
   `guias/acessibilidade-html.md`, `guias/wai-aria.md`) → inclui `acessibilidade` (G). Idem se a obrigação diz o mesmo
   que uma recomendação do e-MAG (mesmo predicado e observável).
2. Senão, categoria-base pelo que a variante muda: valor visual (cor, espaçamento, sombra, tamanho, posição) → `token`;
   família, tamanho, peso ou altura de linha de texto → `tipografia`; marcação, classe, elemento, atributo → `estrutura`;
   parte da anatomia do componente → `componente`; reação a interação, estado, efeito → `comportamento`.
3. **Mais** `acessibilidade` se o observável que a variante muda é propriedade de acessibilidade (nome, papel, estado
   ou propriedade acessível, alternativa textual, operação por teclado, foco visível, contraste); `formulario` se é
   rótulo, obrigatoriedade, instrução ou mensagem de erro de campo; `navegacao` se é destino de navegação, landmark ou
   ordem de navegação. Qualquer uma das três puxa para G.
4. Se as variantes da célula diferirem, use a união das categorias delas.

## Entrada e saída

- Entrada: `F:\Dev Nath\TCC\.tmp-eval\eval-e\tela-e2\classe\entradas\lote-N.json` (lista: `celula`, `hospedeiro`,
  `unidade`, `arquivo`, `secao`, `texto`, `contexto`, `antecedente`, `colocacao` = variantes com descrição e cláusula).
- Saída: `F:\Dev Nath\TCC\.tmp-eval\eval-e\tela-e2\classe\lote-N.json` =
  `{ "<celula>": { "categorias": ["..."], "classe": "DS" | "G", "razao": "uma linha" }, ... }` com TODAS as células do lote.
- Valide: `node "F:\Dev Nath\TCC\.tmp-eval\eval-e\tela-e2\classe\validar-classe.mjs" N` tem de imprimir `ok`.
- Relatório final (≤ 60 palavras): quantas DS e quantas G, e até 3 células em que hesitou (só o id). Não cite texto de regra.
