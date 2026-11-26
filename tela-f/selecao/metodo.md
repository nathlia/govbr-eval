# Método da seleção (tela F selada — candidatos)

Data: 2026-11-26. Papel: seletor. Nada do código da aplicação foi alterado; todas as mudanças foram simuladas apenas no navegador (via `evaluate`) para testar viabilidade.

## O que li

- **Corpus DS 3.7.0** (`ds-rules/govbr-ds-3.7.0-corpus/`, sem abrir `normalizacao/`):
  - `componentes/`: button, tag, tab, table, pagination, breadcrumb, divider, header, input, select, list, item, avatar, signin, loading (aba designer; seções de corpo e "Especificações"); listagem de button/tag/table/pagination/tab desenvolvedor só pelo tamanho.
  - `fundamentos-visuais/`: estados (inteiro nas seções interativo → selecionado), cores (função das cores e paleta: hex dos tokens), tipografia (escala, pesos, títulos).
  - `padroes/design/emptystates.md`.
  - `PROVENIENCIA.md` (cabeçalho).
- **govbr-telas**: `README.md`, `server.mjs` (executado, não lido por dentro), `site/pnip-d/` (lista de arquivos e o CSS servido `styles.*.css`, só para resolver valores de tokens como `--surface-rounder-sm: 4px`, `--surface-opacity-xs: .16`, `--color-secondary-08: #333`, e nomes de variáveis de foco). Não abri `skills/`.
- **pnip-mock/src** (somente leitura): `pages/portal-mpa/processos/processos.component.{html,scss,ts}` (ts parcial), `processos-routing.module.ts`, `processos.module.ts`, `mpa-routing.module.ts`, `mpa.component.ts`, `pnip.component.html`, `layout/header/header.component.{html,scss}`, `utils/components/{multiple-search-table,search-table,status-solicitacao}.utils.ts`, `utils/components/govbr-custom-pagination/*`, `styles.css` (início), `index.html`; localizei `shared/br-select/br-select.component.ts` (só o caminho).

## Como explorei a página

- Servidor: `node server.mjs --port 3411` (em segundo plano; encerrado ao final).
- Playwright headless (Chromium), viewport 1280×900, `playwright` resolvido por `createRequire` apontando para `govbr-eval/node_modules` (nenhum arquivo desse repositório foi lido). Node 25.2.1.
- Scripts (nesta pasta):
  - `explorar.mjs` — captura de página inteira e dump do DOM atravessando shadow roots, com caixa e estilos principais (`explor/dom-inicial.txt`, `explor/inicial.png`).
  - `medir.mjs` — estilos computados de ~60 pontos no estado inicial (inclusive dentro de shadow DOM e `::placeholder`), sequência de foco por teclado, filtro aberto/selecionado, hover, avatar aberto, abas, select da paginação aberto (`explor/medidas.json` + capturas `m-*.png`). Observação: neste script o sessionStorage persistiu entre recarregamentos; as medições de estado que dependiam disso foram refeitas em contexto novo no script seguinte.
  - `testar-viabilidade.mjs` — em contexto novo por cenário: herança de `text-transform` e de variáveis de foco pelo host de web components, ícone do dropdown do avatar, seleção de checkbox → botão "Assinar selecionados", overlay de hover nos itens da lista de filtro, botões "Assumir" desabilitados na aba "Aguardando análise", ícones do select da paginação (`explor/viabilidade.json`).
  - `tabfoco.mjs` — foco por teclado nas abas antes/depois de definir `--focus-style/--focus` no host `br-tab`; espaços entre tags de filtro; truncamento da coluna Solicitante; altura do rótulo "Meus processos".
  - `bc.mjs` — tentativa de verificar o breadcrumb sem `home: true` (falhou: a reatribuição de `links` no navegador não re-renderiza; candidato descartado).
  - `gerar-candidatos.mjs` — gera `candidatos.json`/`candidatos.md` e confere que cada trecho citado existe literalmente no arquivo do corpus (trechos com várias partes usam " […] "; cada parte é conferida). Resultado: 24/24 conferidos.

## Critérios aplicados

- Só entraram pontos medidos como conformes hoje. Pontos já fora do DS foram evitados como alvo (ex.: peso do h2, cor/peso do header da tabela, caixa alta do breadcrumb e do título do header, tamanho e dimensões dos identificadores de página, ícone do select da paginação fechado, tags de filtro com borda, botões só-ícone não circulares, checkbox nativo, chips de status próprios, empty state sem título, rótulo do sign-in, modais SweetAlert).
- Um candidato por elemento+propriedade; onde o mesmo elemento recebe dois candidatos, as propriedades são diferentes e independentes (ex.: rótulo vs. arredondamento da tag "Meus processos"; padding vertical de todas as células vs. truncamento de uma coluna).
- Mudanças em web components só por atributo, por propriedade herdada (`text-transform`), por variável CSS que atravessa o shadow DOM (foco — testado em `br-button` e `br-tab`) ou trocando o componente por markup do core já carregado globalmente.

## O que não pude verificar

- Nenhuma mudança foi aplicada ao código-fonte nem recompilada; as mudanças de fonte descritas não foram testadas no build. Pontos com mais risco: F-facil-4 (efeito exato de `overflow:hidden` no host do botão), F-medio-5 e F-muito-dificil-4/6 (precisam de CSS global ou `::ng-deep`, porque o alvo está em componente filho), F-muito-dificil-3 (cursor resultante com `pointer-events:none`).
- O site exportado pode diferir levemente do `src` (ex.: o checkbox do header aparece para o perfil "SUPERVISOR"); as linhas citadas são do `src`.
- O fundamento "Superfície/Espaçamento/Elevação" não está no corpus coletado; valores px de tokens foram resolvidos pelo CSS servido em `govbr-telas/site`.
- Não verifiquei o comportamento de `br-loading` (o carregamento do mock é instantâneo) nem o menu principal (o botão hambúrguer não abre menu nesta exportação).
- Não abri pastas proibidas; não usei web nem o MCP do validador.
