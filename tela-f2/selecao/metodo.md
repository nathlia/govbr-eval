# Método — seleção de candidatos a defeitos de uso do DS (rota `/pnip-d/portal-mpa/processos?mock-perfil=mpa`)

## 1. O que li

**Documentação do DS 3.7.0** (`F:\Dev Nath\TCC\ds-rules\govbr-ds-3.7.0-corpus\`, sem abrir `normalizacao/`):

- Componentes presentes na página (designer e/ou desenvolvedor): `button`, `tab`, `tag`, `breadcrumb`, `divider`, `table`, `pagination`, `input`, `select`, `header`, `avatar`, `signin`. Li as seções Anatomia, Detalhamento, Comportamentos/Estados e Especificações; nas abas de desenvolvedor, as propriedades obrigatórias e adicionais.
- Fundamentos: `estados.md` (inteiro), `tipografia.md` (escala e tabelas de estilo H1–Placeholder), `cores.md` (princípios, funções das cores e início da paleta).
- Não li por inteiro: `iconografia.md`, `grid.md`, os padrões (`padroes/`), o eMAG e os componentes que não aparecem na rota (accordion, card, carousel, modal etc.).
- O corpus não tem os fundamentos Superfície/Elevação nem Espaçamento. Os valores das escalas (espaçamento, raio, sombra, opacidade, tipografia) e os hexadecimais da paleta vieram do `:root` do CSS servido pela própria página (`tokens-root.json` tem 1265 variáveis; `paleta-hex.json` tem 491 tokens hexadecimais).

**Código-fonte** (`F:\Dev Nath\TCC\pnip-mock\src\`, só leitura e sem git): `processos.component.html/.scss`, `header.component.html/.scss`, `govbr-custom-pagination.component.html/.css/.ts` (trechos), `multiple-search-table.utils.ts`, `search-table.utils.ts`, `status-solicitacao.utils.ts`, `br-select.component.html/.ts` (trechos), `pnip.component.html`, `index.html`, `styles.css`. Para conhecer os atributos usados pelos web components, fiz um levantamento por grep nos templates.

**Página servida**: Playwright headless (Chromium), janela 1280×900. O módulo foi resolvido por `createRequire` a partir de `govbr-eval/node_modules/playwright`, sem ler outros arquivos desse repositório. Não abri nenhuma outra pasta de `F:\Dev Nath\TCC`. Não usei web, servidores MCP nem git.

## 2. Como explorei (scripts nesta pasta)

| Script | O que faz |
|---|---|
| `explorar.mjs` | Captura de tela da página inteira (`pagina-inicial.png`), inventário dos elementos `br-*`/classes `.br-*` e dump do DOM light (`pagina-light-dom.html`). |
| `css-dump.mjs` | Despeja as folhas de estilo do documento e de cada shadow root (`css/`), mais o HTML de cada shadow root. Daí saem os tokens do `:root`. |
| `medir.mjs` | Mede os estilos computados (cor, tipografia, padding, borda, raio, sombra e dimensões) dos alvos em light e shadow DOM → `medidas-inicial.json/.txt`. |
| `sonda.mjs` + `sondas/s01…s08` | Testes de viabilidade: atributos dos web components, estados interativos (hover, foco por teclado e por clique, select aberto, filtro escolhido), custom properties que atravessam o shadow DOM, a `br-tab` sem `is-active` (instância sintética, com escuta de eventos) e as regras CSS que casam com o item em hover. |
| `verificar-candidatos.mjs` | Verificação final dos 24: recarrega a rota, faz a interação, mede ANTES, aplica no navegador o equivalente exato da mudança de fonte, mede DEPOIS e salva recortes → `verificacao/verificacao.json` e `verificacao/<id>-antes/-depois.png`. |
| `gerar-candidatos.mjs` | Gera `candidatos.json` e `candidatos.md`. Confere por substring que cada trecho citado existe literalmente no arquivo do corpus (e em que linha) e que o trecho "de" da mudança existe no arquivo-fonte → `conferencia-citacoes.txt`. Resultado: 24/24 citações OK e todos os "de" OK. |

Arquitetura relevante encontrada:

- `br-header`, `br-breadcrumb`, `br-divider`, `br-button`, `br-tab`/`br-tab-item`, `br-input` e `br-icon-base` são web components (Angular Elements) com shadow DOM. O CSS interno traz o banner "GOVBR-DS … Versão 3.0.0". O código da aplicação não pode editar o interior desses componentes. Sobram três vias: os atributos e inputs; as custom properties herdadas pelo host (o CSS interno usa `var(--interactive)`, `--hover`, `--disabled`, `--focus`, `--border-color`, `--surface-shadow-sm`, `--font-size-scale-up-02` e outras, definidas no `:root` do documento); e o conteúdo projetado. O próprio projeto já usa essa via em `styles.css` (`input[disabled], br-input[disabled] { --disabled: 0.9; … }`).
- Tag, tabela, paginação, select, lista, avatar e o botão de busca ficam em light DOM, dentro de templates Angular com encapsulamento emulado.

## 3. Critérios

1. **Cláusula literal do DS 3.7.0**, específica do DS (valor, variante, parte, estado). Excluí acessibilidade geral (nome acessível, contraste WCAG, ordem de foco, ARIA). Nos estados de foco, a cláusula usada é a cor/estilo de foco do fundamento Estados do DS.
2. **Tipo pela cláusula, com a precedência do enunciado.** Evitei de propósito cláusulas de cor que ficam sob títulos de estado (ex.: "Estado - Interativo" da paginação, "Interativo" de Estados) para não usá-las como T2/T3. Também descartei a cor de link da tabela como T3 e a cor da seta da paginação, porque essas cláusulas prescrevem estado.
3. **Alvo conforme hoje**, medido antes de propor. A propriedade-alvo de cada candidato foi medida e bate com a cláusula (ver `conformeHoje`). Evitei pontos que já estão fora do DS na página atual, entre eles:
   - peso/cor do H2;
   - cor/peso do texto do cabeçalho da tabela;
   - `text-transform` e tamanho do ícone Home do breadcrumb;
   - título do header sem caixa-alta e com cor #333;
   - cor da assinatura;
   - falta de hover na tag "Meus processos";
   - tags de filtro brancas com borda;
   - links sem sublinhado;
   - tamanho e cor ativa dos identificadores de página;
   - ícone e altura do select da paginação;
   - "chips" de status personalizados;
   - raio e tipografia do `.br-sign-in`;
   - botões de ícone da tabela sem rótulo.
4. **Mudança pequena e construível**, sem quebrar a função da página. Cada mudança foi reproduzida no navegador e medida. Nenhum par de candidatos mexe no mesmo elemento e na mesma propriedade.
5. **Variedade.** Os 24 cobrem 11 componentes (Pagination, Avatar, Header, Button, Tag, Table, Divider, Breadcrumb, Tab, Select/List, Input) e mais o H2 (fundamento Tipografia). Os fundamentos tocados são cor, espaçamento, tipografia, raio, sombra e os estados desabilitado, ativo, hover, foco e selecionado.
6. **Ordem de preferência dentro do tipo**: realismo do erro, clareza da violação e segurança de construção. As mudanças por custom property em host de web component vieram por último quando havia alternativa em light DOM.

## 4. O que não pude verificar (e riscos gerais)

- **Não compilei a aplicação.** Testei todas as mudanças só no navegador, com DOM/CSS equivalentes aplicados depois da renderização. Três efeitos que dependem da inicialização do Angular ou do JS do DS ficaram inferidos:
  - header sem o input `title` desde o início (T1-3);
  - `br-tab` sem `is-active` (T4-2). Verifiquei com uma instância sintética: o primeiro item fica ativo e nenhum evento é emitido;
  - o `BRSelect` respeitar `style` inline na lista (T3-5).
- **Não li o código da biblioteca de web components** (fica em `node_modules` do projeto, fora do permitido). As APIs vieram dos templates e de sondas.
- **T1-6 não tem efeito visual** (a tabela fica idêntica). Só aparece na marcação.
- **Sutileza visual.** Alguns T2/T3 dão diferenças pequenas (T2-5 #ccc→#d6d6d6; T3-1 #f0f0f0→#f8f8f8; T2-3 34.8→32px). São detectáveis por medição, nem tanto a olho.
- **Estado persistente.** O filtro escolhido para T1-5 fica salvo em `sessionStorage`. Ao montar a tela, convém limpar o estado.
- **Interações combinadas.** Se vários candidatos forem construídos juntos, há pontos de contato:
  - T1-6 tira a classe `br-table`, que T2-1 e T3-1 usam no seletor (nesse caso, trocar o seletor por `table.table`);
  - T1-2 e T2-2 editam a mesma linha;
  - T3-5 e T4-5 editam o mesmo template do select.
- **Conflito na documentação (evitado).** A borda do item ativo da Tab é `--blue-warm-vivid-90` na especificação da Tab e `--blue-warm-vivid-80` no fundamento Estados; a página usa vivid-80. Não usei esse ponto.
- **Versão do DS.** O CSS do DS dentro dos web components declara versão 3.0.0. A versão do core no bundle global não aparece no CSS servido. As cláusulas são as da documentação 3.7.0 coletada.

## 5. Alternativas testadas e não escolhidas

- **Sem efeito:**
  - classe `shadow-lg` na lista do select (vence a regra `.br-select .br-list`);
  - classe `large` no botão de busca (vence `.br-input .br-button`);
  - `cursor: pointer` herdado pelo input (o user agent mantém `text`).
- **Classificação ambígua:**
  - remoção do divider da Tab via `--border-color: transparent` (estrutura obtida por mudança de valor);
  - cor do link da tabela e da seta da paginação (cláusulas de estado interativo).
- **Risco funcional:** remover o binding `[class.selected]` do select (o campo poderia ficar vazio); remover o botão do select (o JS do `BRSelect` poderia depender do `data-trigger`).
- **Reservas viáveis:**
  - foco das abas `dashed`→`solid` via `--focus-style` (verificado);
  - seta "Página seguinte" sem `[disabled]` na última página (o guard em `nextPage()` evita quebra);
  - letra do avatar `text-up-02` (20.16px, T3);
  - cor do texto das linhas da tabela por hex.
