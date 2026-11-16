# Tela E2 — registro da construção (2026-11-14)

Sorteio único `tela-e2/sorteio.json` (commit `479e730`; semente `f82c2f7c…`, selo `c2de436`; nunca rodado de novo) ·
página `govbr-corpus/cadastro-pais.html` (commit `48d53d7` do ramo `tela-e` do corpus) · método `metodo.md` § 6.
A página foi construída por um agente isolado que não leu `govbr-ds-validator`, `checker-aliases.json`,
`kb-aliases*.json`, `results/` nem `reports/`, e não chamou ferramenta MCP do validator nem axe.

Conferência sem modelo, sem oráculo, sem validator e sem axe: `node tela-e2/conferir-construcao.mjs`
(saída em `conferencia-construcao.txt` e `conferencia-construcao.json`):

| Medida | Resultado |
|---|---|
| observáveis das 9 células violados na página semeada, no estado declarado | **9/9** |
| os mesmos observáveis conformes na página sem semente (todas as trocas desfeitas) | **9/9** |
| células isoladas: desfazer só uma deixa só ela conforme e as outras 8 violadas | **9/9**, **0 interferências** |
| estados S0/S1/S2 alcançados pelos gatilhos declarados (11 páginas × 3), em até 120 s, sem recarga, sem erro | **33/33** |
| pontos conformes (67 na semeada + os mesmos 67 na sem semente) | **134/134** |

Chromium headless do Playwright, 1280×900 (e 640×450 para o e-MAG 4.3); ~1 min.

## Como servir

- **Montar:** `npm run build` no `govbr-corpus` (entrada `cadastro-pais` em `vite.config.ts`).
- **Servir o `dist/`:** `node tela-e2/servir.mjs [porta=3219]` → `http://127.0.0.1:3219/cadastro-pais.html`
  (estático, sem fallback de SPA). Fora do checkout principal: `CORPUS_DIR=<checkout do govbr-corpus>`; neste
  worktree a construção foi conferida com `CORPUS_DIR="F:/Dev Nath/TCC/.tmp-eval/corpus-e"`.
- **Superfície:** a página, a folha `assets/cadastro-pais-*.css` (com as fontes Rawline e Font Awesome),
  `cadastro-pais/core.min.js` (byte a byte o do pacote 3.7.0, `-text` no `.gitattributes`),
  `cadastro-pais/comportamento.js`, as duas marcas SVG e as páginas de destino `servicos-defesa.html`,
  `administracao.html`, `paises-importadores.html`, `minha-conta.html`. Nenhum pedido fora da origem.

## Como a página foi montada

Marcação dos exemplos oficiais do `@govbr-ds/core` 3.7.0 (`dist/components/*/examples`), scripts clássicos, CSS
pelo Vite (a folha da A2 de Rawline é reaproveitada por `@import`). Do `core.js`: `BRBreadcrumb`, `BRSelect`,
`BRAlert` (o 3.7.0 exporta a classe do message com esse nome). Escritos à mão em `comportamento.js`: envio e
retorno, `aria-checked` do switch e aviso "Emissão automática ligada/desligada" (efeito imediato), reexibição da
mensagem de orientação pela ajuda e destino do foco ao fechá-la, Cancelar.

| Estado | Passos declarados |
|---|---|
| S0 | carregar `/cadastro-pais.html` |
| S1 | S0 + clicar `#btn-salvar` (Salvar País) com o formulário vazio |
| S2 | S0 + clicar o gatilho do select (`#sel-continente [data-trigger]`) |

## Células em vigor (9: 6 DS + 3 G) — onde estão e o que se mede

| Célula (classe) | Construção | Observável (estado) | Troca que a desfaz (página sem semente) |
|---|---|---|---|
| `btn-limpar::a2-2ac598dc24db` (DS) | `order: 1` no Limpar Campos (`.acoes-formulario .acao-limpar`); DOM e Tab inalterados; barra com `gap`, sem margens | x do Limpar > borda direita do Salvar (S0) | tira a regra |
| `msg-orientacao::a2-d6b3f0e36943` (DS) | corpo da mensagem com jargão de sistema, sem siglas (persistidos, commit, transação, renderizada, cache, endpoint, banco), no mesmo assunto (o cadastro) | ≥ 3 termos técnicos no texto (S0; medidos 7) | corpo em linguagem simples |
| `btn-ajuda::a2-5b47246a41c1` (DS) | botão circular 40×40 sem `<i>`; `aria-label` e `span.sr-only` mantidos | 0 ícones visíveis no botão (S0); nome AX continua "Ajuda sobre o cadastro" | devolve `<i class="fas fa-question">` |
| `inp-codigo::a2-a39f3ad397d4` (DS) | `font-family: Arial, Helvetica, sans-serif` na raiz `.br-input` (o core põe `inherit` no input) | fonte declarada e fonte usada (CDP) do rótulo, do campo com texto e do apoio sem Rawline (S0; usada Arial) | tira a regra |
| `rad-situacao::a2-f838b54da560` (DS) | legend com `width: 100%; text-align: center` | texto da legend começa > 20 px à direita da 1ª opção e centrado no grupo (±2 px) (S0) | tira a regra |
| `msg-erro::a2-ef29db5bb4ac` (DS) | `--message-background: --blue-warm-vivid-50`, ícones e texto `--pure-0` (o primeiro plano do Selecionado, para não criar falha de contraste à parte: branco sobre o azul dá 4,6:1) e `fa-check` antes do título; classe `danger` e ícone `times-circle` mantidos | fundo = `--blue-warm-vivid-50` e `fa-check` presente (S1) | tira as duas regras e o `<i>` |
| `sel-continente::a2-7348bce34289` (G) | `--text-color: #aaa` nos itens do select (o item selecionado continua com a cor do core) | contraste das 6 opções < 4,5 (S2; 2,32:1) | tira a regra |
| `inp-nome-pais::a2-328f62cfe4ce` (G) | `readonly` no campo; `comportamento.js` o tira no clique | Tab da ajuda → foco no campo → digitar "Chile" → valor vazio (S0) | tira o `readonly` e o ouvinte |
| `lst-paises::a2-5432c282d0d7` (G) | itens com `height: 74px; overflow: hidden` (a 1280 cabem: nenhum corte); item = nome + linha de dados | a 640×450 (200 %) os 4 itens perdem 19 px de texto (S0) | tira a regra |

**Acoplamentos inevitáveis** (a variante sorteada, construída ao pé da letra, toca também o observável de outra
unidade elegível do mesmo hospedeiro; não são defeitos acidentais e ficam aqui para a referência decidir):
`btn-limpar` — `a2-df449a7d5cd8` (mesma posição por importância) e a ordem visual ≠ ordem de Tab do e-MAG 1.4
(`a2-bde476da44c9`; a variante manda "sem mudar a ordem do DOM"); `msg-orientacao` — "texto curto, claro e
objetivo" (`a2-db30195b0e66`); `btn-ajuda` — referência do ícone de ajuda e ícone que expressa a ação
(`a2-460f5696acde`, `a2-d47f4c470491`, `a2-952e88a5af0d`, `a2-db50df136f86`, `a2-72ddeddc1ac8`); `msg-erro` — cores
do estado Erro do Message e do feedback de erro (`a2-90ea0bde7e04`, `a2-19a22fa26e63`); `lst-paises` — altura do item
acompanha o conteúdo (`a2-a14d31901423`, só a 200 %).

## Pontos conformes (67, medidos na semeada e na sem semente)

Página: DOCTYPE/lang/UTF-8/título; um `main`; h1 → h2; HTML servido sem `style`/`script` embutido, sem `style=`/`on*=`,
sem `/>`, sem `type` em script, sem `font`/`align`/`color`/`bgcolor`, sem tabela; links para o mesmo destino com a
mesma descrição e destinos existentes; `core.min.js` = pacote 3.7.0; nenhum pedido externo; nenhum erro de console;
640×450 sem rolagem horizontal. Andaime: cabeçalho, rodapé, atalho (1º filho, 1º Tab, sem papéis de menu), trilha
(item atual sem `tabindex`, nome em português), divisor. Comparações das células: Cancelar à esquerda de Salvar;
ícones do Fechar e do gatilho do select (centrados, `aria-hidden`); Rawline usada no h1, rótulo do nome, mensagem,
lista, legenda e switch; msg-erro sem jargão; `inp-codigo` aceita digitação logo após o Tab; contraste da lista
≥ 4,5; msg-orientacao sem corte a 200 %. Obrigações elegíveis não sorteadas: mensagem de uso geral entre cabeçalho e
trilha, superfície sangrando e conteúdo na área útil, cores/ícone/tipo oculto do Informativo, ícone à esquerda e
Fechar no topo à direita; Fechar e ajuda (dimensões, ênfase, nomes); barra de ações (ênfases, 40 px, uma linha,
capitalização); rótulos (associação, sem dois-pontos, opcional entre parênteses); `required` sem valor; apoio do
código ligado e com a sigla do exemplo por extenso; opções do select com `name`/`value`, placeholder; radio
(`required`, borda padrão na carga, 24×24, fieldset sem borda, legenda acima, opções curtas, termos iguais aos da
lista); switch (role, `aria-checked`, texto de estado pelos `data-*`, efeito imediato, árvore AX, contêiner parado,
Espaço); lista (role, 4 itens, divisores, título, área útil, sem corte a 1280); ordem de Tab; Espaço/setas no radio;
Fechar → foco no h1, ajuda reexibe com foco no Fechar e devolve o foco à ajuda; select (sombra, ícone alterna, 6
opções sem rolagem, junto do campo, Esc recolhe sem escolher, escolher leva ao campo e marca selecionado); S1 (tipo
Erro, região viva, sem Fechar, até a borda do formulário, diz erro/por quê/o que fazer; erro de campo ligado por
`aria-describedby`, `aria-invalid`, borda de erro; uma mensagem para o grupo abaixo da última opção; ícones
`aria-hidden`; árvore AX; erro persiste ao interagir sem corrigir).

## Decisões de construção fora do sorteio (todas para a página conforme)

- **Radio obrigatório na carga:** o core 3.7.0 pinta de vermelho a caixa de radio `:invalid` (todo grupo
  `required` sem escolha, já na carga). Isso mostraria o estado de erro antes de qualquer erro (cores do radio,
  `a2-b4f55de91129`). A folha da página devolve a borda padrão enquanto a opção não tem a classe `invalid` do DS, e
  `comportamento.js` põe `invalid` nas três opções em S1. `required` continua (`a2-12d0d71f5dd2`).
- **Gatilho do select devolve o foco ao campo:** no core 3.7.0, depois do clique no gatilho o foco fica no botão,
  onde o Esc não recolhe a lista e o campo não fica com estado de foco (`a2-654520f6ba0e`, `a2-a451e00d7b63`).
  O ouvinte de clique do gatilho foca o campo. S2 continua sendo "clicar o gatilho".
- **Mensagem de uso geral:** superfície na largura da tela, com `padding` lateral calculado pelos mesmos tokens e
  pontos de quebra do `container-lg`, de modo que ícone, texto e Fechar ficam na área útil da grid.
- **Cancelar** é botão (ação de abandonar o cadastro) que leva a `paises-importadores.html`, para não criar um
  segundo link para o mesmo destino da trilha com outra descrição.
- **Conta da usuária** no cabeçalho: `a.br-sign-in` "Conta de Helena" para `minha-conta.html`, avatar
  `aria-hidden` (sem menu suspenso: `list`/`item` no andaime ficariam fora dos hospedeiros declarados). Nome fictício.
- **Sucesso** (envio completo) mostra "País salvo." no lugar do retorno — estado fora dos declarados.
- **`.sr-only` e `[hidden]`** na folha da página (o core 3.7.0 não define `.sr-only`, e `.br-message` com `display:
  flex` ganharia de `hidden`).
- **Classes por lugar** (D-24): `acao-limpar`, `acao-salvar`, `acao-cancelar`, `campo-*`, `marca-retorno`,
  `item-pais`, etc.; nenhuma classe, id, comentário ou texto descreve defeito.

## Descartes e reposições

**Nenhum.** As 9 células foram construídas e medidas como sorteadas. `descartes.json` (lista vazia) passou pelo
caminho de reposição da própria ferramenta (`node tela-e2/sortear-sementes.mjs --repor`), que gravou
`sementes-vigentes.json`: 9 vigentes (6 DS + 3 G), 0 substituições, déficit DS 0 / G 0. Portão (≥ 5 DS em vigor)
alcançado; cota DS = 6. Folga de reposição, se uma célula sair depois (auditoria): DS 14–27 células cabíveis
depois da posição de cada semente DS na ordem da classe; G 8–21.

## Limites

A conferência mede o observável declarado de cada célula, a página sem semente e 67 pontos conformes; não prova
que a página cumpre as 268 unidades elegíveis (isso é da auditoria cega por medição). Os acoplamentos listados acima
são da variante sorteada. Quem construiu a página conhece o sorteio (D-48).
