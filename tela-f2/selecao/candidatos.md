# Candidatos a defeitos — rota /pnip-d/portal-mpa/processos (DS gov.br 3.7.0)

Ordem dentro de cada tipo = preferência (1 = mais recomendado). Medições de antes/depois em `verificacao/verificacao.json`; recortes em `verificacao/<id>-antes.png` e `-depois.png`. Todas as mudanças foram testadas só no navegador (equivalente via DOM/CSS), sem tocar no código-fonte.

| id | tipo | nível | interação | componente | alvo (resumo) |
|---|---|---|---|---|---|
| T1-1 | T1 (anatomia) | médio | não | Pagination | seta de navegação esquerda da paginação (light DOM) |
| T1-2 | T1 (marcacao) | fácil | não | Avatar | conteúdo interno (letra "U") do avatar no cabeçalho (light DOM) |
| T1-3 | T1 (anatomia) | difícil | não | Header | título do cabeçalho "Plataforma Nacional da Indústria do Pescado" |
| T1-4 | T1 (anatomia) | difícil | não | Button | br-button "Exportar" (ênfase secundária, tipo padrão) ao lad |
| T1-5 | T1 (marcacao) | muito difícil | sim | Tag (de interação dispensável) / Button | botão terciário de remoção da tag de filtro selecionado (light DOM) |
| T1-6 | T1 (marcacao) | difícil | não | Table | div.br-table que envolve table.table da listagem de processo |
| T2-1 | T2 | médio | não | Table | células das linhas da tabela de processos (light DOM) |
| T2-2 | T2 | difícil | não | Avatar | superfície do avatar letra "U" no cabeçalho (light DOM) |
| T2-3 | T2 | difícil | não | Tipografia (H2 — título da página) | pnip-mpa-processos h2 "Processos" (light DOM) |
| T2-4 | T2 | médio | não | Tag (de interação) | label da tag (light DOM) |
| T2-5 | T2 | difícil | não | Divider | br-divider (size="medium") logo abaixo do breadcrumb → shado |
| T2-6 | T2 | difícil | não | Header | superfície do cabeçalho |
| T3-1 | T3 | difícil | não | Table | células do cabeçalho da tabela (light DOM) |
| T3-2 | T3 | médio | não | Tag (de interação) | superfície da tag (light DOM) |
| T3-3 | T3 | médio | não | Breadcrumb | ícone do botão terciário Home |
| T3-4 | T3 | difícil | não | Tab | rótulos das abas "Aguardando análise", "Tramitando", "Concluídos" |
| T3-5 | T3 | muito difícil | sim | Select (lista suspensa) | lista suspensa dos selects "Exibir" e "Página" da paginação (light DOM) |
| T3-6 | T3 | difícil | não | Input (ação interna) | botão circular de lupa dentro do campo "Pesquise aqui ..." (light DOM) |
| T4-1 | T4 | difícil | não | Button (estado desabilitado) | br-button[disabled][title^="Desassociar"] na coluna de ações |
| T4-2 | T4 | médio | não | Tab (estado ativo) | br-tab > br-tab-item#TRAMITANDO (e o shadow DOM li.tab-item. |
| T4-3 | T4 | muito difícil | sim | Button (estado hover) | br-button "Voltar" (secundário, rodapé da página) → shadow D |
| T4-4 | T4 | muito difícil | sim | Input (estado foco) | campo "Pesquise aqui ..." |
| T4-5 | T4 | muito difícil | sim | Select / List (estado hover do item) | itens das listas "Exibir"/"Página" (light DOM) |
| T4-6 | T4 | muito difícil | sim | Select / Item (estado selecionado) | item já escolhido ("10") na lista "Exibir" da paginação (light DOM) |

## T1 — Estrutura

### T1-1 (ordem 1) — Pagination

- **Subtipo:** anatomia
- **Nível:** médio · **Exige interação:** não
- **Elemento:** nav.br-pagination.small > ul > li:first-child > button.br-button.circle[aria-label="Página anterior"] — seta de navegação esquerda da paginação (light DOM)
- **Estado:** inicial (rolar até a paginação, abaixo da tabela)
- **Conforme hoje (medido):** As duas Setas de Navegação estão presentes: botões circulares "Página anterior" e "Página seguinte" (40×40 px) ladeando o identificador de página "1".
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\utils\components\govbr-custom-pagination\govbr-custom-pagination.component.html`, linha 8-12

  de:

  ```
  <li>
    <button class="br-button circle" type="button" [disabled]="currentPage === 1" (click)="previousPage()" aria-label="Página anterior">
      <i class="fas fa-angle-left" aria-hidden="true"></i>
    </button>
  </li>
  ```

  para:

  ```
  (bloco removido — a paginação passa a ter só a seta "Página seguinte")
  ```

- **Observável:** Na paginação aparece apenas a seta para a direita; no DOM, nav.br-pagination.small tem 1 botão circular de seta em vez de 2 (verificado: ["Página seguinte"]).
- **Cláusula:** `componentes/pagination__designer.md` (Anatomia > #### 1. Setas de Navegação (Obrigatório); linha 49; conferido literal: sim)

  > Constituem um *Botão* para esquerda e outro para direita. A cada clique, o usuário poderá navegar página por página de forma crescente ou decrescente (direita / esquerda).

- **Risco:** Baixo. Remoção de marcação estática; previousPage() fica sem uso (sem erro de compilação). Como há só 1 página, a seta esquerda hoje já aparece desabilitada — o auditor precisa notar a ausência, não um mau funcionamento.

### T1-2 (ordem 2) — Avatar

- **Subtipo:** marcacao
- **Nível:** fácil · **Exige interação:** não
- **Elemento:** button.br-sign-in > span.br-avatar > span.content — conteúdo interno (letra "U") do avatar no cabeçalho (light DOM)
- **Estado:** inicial
- **Conforme hoje (medido):** span.content presente: superfície circular 40×40 px, border-radius 50%, display flex, letra centralizada 24.192px bold.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\layout\header\header.component.html`, linha 7

  de:

  ```
  <span class="content bg-orange-vivid-30 text-pure-0">
  ```

  para:

  ```
  <span class="bg-orange-vivid-30 text-pure-0">
  ```

- **Observável:** O avatar deixa de ser um círculo: vira um retângulo laranja estreito (≈18×40 px, border-radius 0) com a letra encostada; no DOM falta a classe content dentro de .br-avatar.
- **Cláusula:** `componentes/avatar__desenvolvedor.md` (Como usar > Propriedades obrigatórias; linha 22; conferido literal: sim)

  > | class    | string | **content**   | Aplicado no conteúdo interno. Pode conter imagem, ícone ou letra. |

- **Risco:** Baixo. Só muda classe. Se T2-2 também for escolhido, as duas mudanças tocam a mesma linha (atributos distintos: classe estrutural vs cor de fundo).

### T1-3 (ordem 3) — Header

- **Subtipo:** anatomia
- **Nível:** difícil · **Exige interação:** não
- **Elemento:** br-header (web component) → shadow DOM .header-info .header-title — título do cabeçalho "Plataforma Nacional da Indústria do Pescado"
- **Estado:** inicial
- **Conforme hoje (medido):** O header exibe o título (div.header-title, 24.192px regular) ao lado do botão de menu.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\layout\header\header.component.html`, linha 1

  de:

  ```
  <br-header [image]="logo" [signature]="signature" [title]="getNomePlataforma()" [hasMenu]="true" [hasTitleLink]="false"></br-header>
  ```

  para:

  ```
  <br-header [image]="logo" [signature]="signature" [hasMenu]="true" [hasTitleLink]="false"></br-header>
  ```

- **Observável:** Cabeçalho só com logo, assinatura e botão de menu; o shadow DOM de br-header não contém .header-title (verificado: null). Visualmente parece um header "limpo".
- **Cláusula:** `componentes/header__designer.md` (Detalhamento dos Itens > ### 3. Título (Obrigatório); linha 113; conferido literal: sim)

  > No *Header* deve sempre existir um título que identifique o site, sistema ou aplicativo. Em alguns dispositivos (como celulares), o título pode identificar a página atual.

- **Risco:** Baixo. Testado removendo o atributo title do host após a renderização; com o input ausente desde a inicialização espera-se o mesmo (o componente só renderiza .header-title quando há título). getNomePlataforma() fica sem uso no template.

### T1-4 (ordem 4) — Button

- **Subtipo:** anatomia
- **Nível:** difícil · **Exige interação:** não
- **Elemento:** br-button "Exportar" (ênfase secundária, tipo padrão) ao lado do título da página → shadow DOM button.br-button.secondary
- **Estado:** inicial
- **Conforme hoje (medido):** Botão padrão secundário com rótulo "Exportar" (16.8px semi-bold), 118×40 px, borda 1px #1351b4, raio pill.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.html`, linha 9

  de:

  ```
  <br-button type="secondary" label="Exportar" (click)="irParaExportarHs()"></br-button>
  ```

  para:

  ```
  <br-button type="secondary" icon="file-export" title="Exportar" (click)="irParaExportarHs()"></br-button>
  ```

- **Observável:** O botão vira uma pílula secundária (78×40 px, padding 24px, raio pill) só com o ícone fa-file-export, sem texto; o botão continua do tipo padrão (não circular).
- **Cláusula:** `componentes/button__designer.md` (Detalhamento dos Itens > #### 2. Rótulo (Obrigatório); linha 62; conferido literal: sim)

  > O rótulo é um elemento obrigatório. A exceção ocorre na versão tipo circular uma vez que não existe rótulo.

- **Risco:** Médio. O ícone é renderizado pelo atributo icon (verificado: <i class="fas fa-file-export mr-1">). O botão interno fica com aria-label vazio e sem texto: um auditor pode registrar como falha de nome acessível (fora do escopo DS); o title no host mitiga. Os botões de ícone da tabela já são padrão sem rótulo — o auditor pode considerar o padrão "da casa".

### T1-5 (ordem 5) — Tag (de interação dispensável) / Button

- **Subtipo:** marcacao
- **Nível:** muito difícil · **Exige interação:** sim
- **Elemento:** pnip-multiple-search-table-utils .row.pl-2 span.br-tag.interaction.small > button.br-button.inverted.circle — botão terciário de remoção da tag de filtro selecionado (light DOM)
- **Estado:** Clicar na tag de filtro "Status" → escolher a primeira opção da lista ("Aguardando análise") → aparece a tag azul do filtro selecionado com o botão ×.
- **Conforme hoje (medido):** O botão × é um br-button circular invertido: 28×28 px (densidade extra-alta = --spacing-scale-3xh), raio 50%, fundo #1351b4, ícone branco.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\utils\components\multiple-search-table.utils.ts`, linha 28

  de:

  ```
  <button class="br-button inverted circle" type="button" (click)="removeSelected(i)">
  ```

  para:

  ```
  <button class="inverted circle" type="button" (click)="removeSelected(i)">
  ```

- **Observável:** Dentro da tag azul aparece um botão nativo do navegador (fundo #f0f0f0, borda outset 2px, cantos retos, 40×30 px, ícone preto) em vez do botão circular do DS; no DOM falta a classe br-button.
- **Cláusula:** `componentes/button__desenvolvedor.md` (Como usar > Propriedades obrigatórias; linha 21; conferido literal: sim)

  > | class    | string | **br-button** | Container do componente. |

- **Risco:** Baixo para construir; o clique continua removendo o filtro. O filtro fica salvo em sessionStorage (chave filters-process-mpa-TRAMITANDO): o auditor pode chegar à página já com a tag visível, ou precisar limpar o estado. Âncora complementar: tag__designer.md, "A *tag* interativa é o único tipo em que é possível incluir um botão terciário para a sua remoção ou exclusão."

### T1-6 (ordem 6) — Table

- **Subtipo:** marcacao
- **Nível:** difícil · **Exige interação:** não
- **Elemento:** div.br-table que envolve table.table da listagem de processos (light DOM)
- **Estado:** inicial
- **Conforme hoje (medido):** A tabela está dentro de <div class="br-table">.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.html`, linha 56

  de:

  ```
  <div class="br-table">
  ```

  para:

  ```
  <div>
  ```

- **Observável:** Apenas no DOM: o contêiner da tabela não tem a classe br-table. Medido: nenhuma mudança visual (cabeçalho #f0f0f0, células 16px/24px continuam iguais), porque os estilos vêm de outras regras da página.
- **Cláusula:** `componentes/table__desenvolvedor.md` (Como usar > Propriedades obrigatórias; linha 21; conferido literal: sim)

  > | class    | string | **br-table** | Container do componente |

- **Risco:** Defeito invisível em captura de tela; só é detectável inspecionando a marcação. Se o critério de seleção exigir efeito visual, rebaixar ou descartar. Se T2-1/T3-1 também forem construídos com seletor .br-table, eles deixariam de pegar (ajustar o seletor para table.table).

## T2 — Valor fora do sistema

### T2-1 (ordem 1) — Table

- **Nível:** médio · **Exige interação:** não
- **Elemento:** .br-table tbody td — células das linhas da tabela de processos (light DOM)
- **Estado:** inicial
- **Conforme hoje (medido):** padding das células: 16px (top/bottom) e 24px (left/right) = densidade padrão (--spacing-scale-2x / --spacing-scale-3x).
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.scss`, linha após 3 (acrescentar)

  de:

  ```
  (nada)
  ```

  para:

  ```
  .br-table td {
     padding-top: 10px;
     padding-bottom: 10px;
  }
  ```

- **Valor depois:** padding-top/bottom = 10px. Fora do sistema: a escala de espaçamento servida (:root) é 0, 4, 8, 12, 16, 20, 24, 28… px (--spacing-scale-half … --spacing-scale-10xh); 10px não é token, e não corresponde a nenhuma densidade da tabela (alta 8px, padrão 16px, baixa 24px).
- **Observável:** Linhas mais baixas (1ª linha 154→142 px) enquanto o cabeçalho mantém 16px; medir padding-top computado de qualquer td de tbody.
- **Cláusula:** `componentes/table__designer.md` (Especificações > Espaçamentos; linha 423; conferido literal: sim)

  > | Linhas (Densidade Padrão)             | padding-top    |  `--spacing-scale-2x`  |

- **Risco:** Baixo. Encapsulamento emulado do Angular: o seletor vira .br-table[_ngcontent] td[_ngcontent] e vence a regra do DS (verificado com regra equivalente).

### T2-2 (ordem 2) — Avatar

- **Nível:** difícil · **Exige interação:** não
- **Elemento:** span.br-avatar > span.content — superfície do avatar letra "U" no cabeçalho (light DOM)
- **Estado:** inicial
- **Conforme hoje (medido):** background-color rgb(255, 140, 0) = #ff8c00 (classe bg-orange-vivid-30; hex presente na paleta servida).
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\layout\header\header.component.html`, linha 7

  de:

  ```
  <span class="content bg-orange-vivid-30 text-pure-0">
  ```

  para:

  ```
  <span class="content text-pure-0" style="background-color: #f5871f">
  ```

- **Valor depois:** rgb(245, 135, 31) = #f5871f. Fora do sistema: conferido contra os 491 tokens hexadecimais do :root servido (paleta-hex.json) — não corresponde a nenhum.
- **Observável:** Avatar com laranja levemente diferente; medir background-color de .br-avatar .content.
- **Cláusula:** `componentes/avatar__designer.md` (Detalhamento dos Itens > ### 1. Superfície circular (Obrigatório); linha 46; conferido literal: sim)

  > A superfície, nos casos dos avatares icônico e letra, podem assumir quaisquer cores da paleta cromática do Design System sendo sugerida a utilização das cores de apoio.

- **Risco:** Baixo. A classe utilitária é retirada porque utilitários de cor do DS podem usar !important. Reforço: fundamentos-visuais/cores.md, "Interfaces digitais do governo devem utilizar sempre as cores pré-definidas."

### T2-3 (ordem 3) — Tipografia (H2 — título da página)

- **Nível:** difícil · **Exige interação:** não
- **Elemento:** pnip-mpa-processos h2 "Processos" (light DOM)
- **Estado:** inicial
- **Conforme hoje (medido):** font-size 34.832px = --font-size-scale-up-05 (o tamanho previsto para H2).
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.html`, linha 6

  de:

  ```
  <h2 class="text-bold text-blue-vivid-60 mt-0 mb-4 pb-0">Processos</h2>
  ```

  para:

  ```
  <h2 class="text-bold text-blue-vivid-60 mt-0 mb-4 pb-0" style="font-size: 2rem">Processos</h2>
  ```

- **Valor depois:** font-size computado 32px. Fora do sistema: a escala tipográfica servida tem … 29.036, 34.832 … px; 32px não é degrau da escala.
- **Observável:** Título um pouco menor (altura 40→37 px); medir font-size do h2.
- **Cláusula:** `fundamentos-visuais/tipografia.md` (Tabelas de Estilos > ### Título (H2); linha 184; conferido literal: sim)

  > | Size          | `--font-size-scale-up-05` |

- **Risco:** Baixo. 2rem depende da fonte raiz 16px (medido: 32px). Atenção: peso (700) e cor (blue-vivid-60) do h2 já estão fora do H2 do DS hoje; o alvo é só o tamanho.

### T2-4 (ordem 4) — Tag (de interação)

- **Nível:** médio · **Exige interação:** não
- **Elemento:** span.br-tag.interaction.small "Meus processos" > span.text-truncate — label da tag (light DOM)
- **Estado:** inicial (aba Tramitando, perfil não-Consulta)
- **Conforme hoje (medido):** label 16.8px (= --font-size-scale-up-01), peso 500 (medium); as tags de filtro logo abaixo também 16.8px.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.html`, linha 29

  de:

  ```
  <span class="text-truncate">Meus processos</span>
  ```

  para:

  ```
  <span class="text-truncate" style="font-size: 15px">Meus processos</span>
  ```

- **Valor depois:** font-size 15px. Fora do sistema: não é degrau da escala tipográfica servida (14 / 16.8 / 20.16…).
- **Observável:** Texto de "Meus processos" menor que o das tags vizinhas; medir font-size do span.
- **Cláusula:** `componentes/tag__designer.md` (Especificações > ### Tipografia [*Tag* de Interação]; linha 357; conferido literal: sim)

  > | Label | size        | `--font-size-scale-up-01` |

- **Risco:** Baixo.

### T2-5 (ordem 5) — Divider

- **Nível:** difícil · **Exige interação:** não
- **Elemento:** br-divider (size="medium") logo abaixo do breadcrumb → shadow DOM span.br-divider.md
- **Estado:** inicial
- **Conforme hoje (medido):** border-top 2px solid rgb(204, 204, 204) = #ccc = --gray-20.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.html`, linha 2

  de:

  ```
  <br-divider size="medium" class="mt-0 mb-0"></br-divider>
  ```

  para:

  ```
  <br-divider size="medium" class="mt-0 mb-0" style="--border-color: #d6d6d6"></br-divider>
  ```

- **Valor depois:** border-top-color rgb(214, 214, 214) = #d6d6d6. Fora do sistema: não corresponde a nenhum token hexadecimal do :root servido (gray-10 = #e6e6e6, gray-20 = #ccc).
- **Observável:** Linha divisória levemente mais clara; medir border-top-color do .br-divider no shadow DOM de br-divider.
- **Cláusula:** `componentes/divider__designer.md` (Especificações > ### Cor; linha 128; conferido literal: sim)

  > | *Divider* (fundo claro)  | background | `--gray-20` |

- **Risco:** Baixo; a custom property herda para o shadow DOM (verificado). Diferença visual muito sutil.

### T2-6 (ordem 6) — Header

- **Nível:** difícil · **Exige interação:** não
- **Elemento:** br-header → shadow DOM header.br-header — superfície do cabeçalho
- **Estado:** inicial
- **Conforme hoje (medido):** box-shadow rgba(0,0,0,0.16) 0 1px 6px 0 = --surface-shadow-sm.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\layout\header\header.component.scss`, linha após 94 (acrescentar)

  de:

  ```
  (nada)
  ```

  para:

  ```
  br-header {
     --surface-shadow-sm: 0 2px 12px rgba(0, 0, 0, 0.3);
  }
  ```

- **Valor depois:** box-shadow rgba(0,0,0,0.3) 0 2px 12px 0. Fora do sistema: offset 2px (tokens de offset: 0/1/3/6/9px), blur 12px (tokens: 0/1/3/6/9px) e opacidade 0.3 com preto não compõem nenhum token --surface-shadow-*.
- **Observável:** Sombra do cabeçalho mais escura e espalhada; medir box-shadow de header.br-header no shadow DOM.
- **Cláusula:** `componentes/header__designer.md` (Especificações > ### Sombra; linha 575; conferido literal: sim)

  > |     Superfície      | `--surface-shadow-sm` |

- **Risco:** Médio-baixo: redefinir um token dentro do escopo do componente é um padrão já usado neste código (styles.css redefine --disabled/--background-light em br-input[disabled]). Afeta só o que usa --surface-shadow-sm dentro de br-header.

## T3 — Valor do sistema no lugar errado

### T3-1 (ordem 1) — Table

- **Nível:** difícil · **Exige interação:** não
- **Elemento:** .br-table thead th — células do cabeçalho da tabela (light DOM)
- **Estado:** inicial
- **Conforme hoje (medido):** background-color rgb(240, 240, 240) = #f0f0f0 = --gray-5. (A cor do texto e o peso do cabeçalho já não seguem o DS hoje; o alvo é só o fundo.)
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.scss`, linha após 3 (acrescentar)

  de:

  ```
  (nada)
  ```

  para:

  ```
  .br-table thead th {
     background-color: var(--gray-2);
  }
  ```

- **Valor depois:** rgb(248, 248, 248) = #f8f8f8 = --gray-2: token do DS (cor de superfície alternativa), mas não o previsto para o Header da Tabela.
- **Observável:** Faixa do cabeçalho quase branca; medir background-color de qualquer th.
- **Cláusula:** `componentes/table__designer.md` (Especificações > ### Cores; linha 382; conferido literal: sim)

  > | Header da Tabela                  | background | `--gray-5`             |

- **Risco:** Baixo. Contraste visual pequeno.

### T3-2 (ordem 2) — Tag (de interação)

- **Nível:** médio · **Exige interação:** não
- **Elemento:** span.br-tag.interaction.small "Meus processos" — superfície da tag (light DOM)
- **Estado:** inicial
- **Conforme hoje (medido):** border-radius 4px = --surface-rounder-sm; as tags de filtro vizinhas também 4px.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.html`, linha 25

  de:

  ```
  <span class="br-tag interaction small" (click)="toggleMeusProcessos()"
  ```

  para:

  ```
  <span class="br-tag interaction small rounder-lg" (click)="toggleMeusProcessos()"
  ```

- **Valor depois:** border-radius 16px = --surface-rounder-lg (utilitário rounder-lg do próprio DS): valor do sistema, mas não o previsto para tag de interação.
- **Observável:** "Meus processos" com cantos bem arredondados (quase pílula, altura 32px) enquanto as tags vizinhas têm cantos de 4px.
- **Cláusula:** `componentes/tag__designer.md` (Especificações > ### Arredondamento [*Tag* de Interação] (1ª ocorrência, linha 430); linha 430, 436; conferido literal: sim)

  > | Superfície | top-left-bottom-right | `--surface-rounder-sm` |

- **Risco:** Baixo. O mesmo trecho literal aparece também em Arredondamento [Tag de Texto] (linha 436); citar a seção.

### T3-3 (ordem 3) — Breadcrumb

- **Nível:** médio · **Exige interação:** não
- **Elemento:** br-breadcrumb → shadow DOM li.crumb.home button.br-button i.fa-home — ícone do botão terciário Home
- **Estado:** inicial
- **Conforme hoje (medido):** cor do ícone Home rgb(19, 81, 180) = #1351b4 = --blue-warm-vivid-70.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.html`, linha 1

  de:

  ```
  <br-breadcrumb [links]="breadcrumb"></br-breadcrumb>
  ```

  para:

  ```
  <br-breadcrumb [links]="breadcrumb" style="--interactive: var(--blue-vivid-60)"></br-breadcrumb>
  ```

- **Valor depois:** rgb(0, 94, 162) = #005ea2 = --blue-vivid-60: token da paleta (o mesmo azul do título da página), mas não o previsto para o ícone Home.
- **Observável:** Ícone da casinha num azul diferente do dos demais elementos interativos (ex.: botão Exportar); medir color do i.fa-home no shadow DOM.
- **Cláusula:** `componentes/breadcrumb__designer.md` (Especificações > ### Cor; linha 157; conferido literal: sim)

  > | Botão Terciário Home     | icon       | `--blue-warm-vivid-70` |

- **Risco:** Baixo. A custom property herda para o shadow DOM (verificado). O overlay de hover usa --interactive-rgb, que não muda.

### T3-4 (ordem 4) — Tab

- **Nível:** difícil · **Exige interação:** não
- **Elemento:** br-tab → shadow DOM .tab-item button / span.name — rótulos das abas "Aguardando análise", "Tramitando", "Concluídos"
- **Estado:** inicial
- **Conforme hoje (medido):** font-size 20.16px (= --font-size-scale-up-02), peso 500 nos três rótulos.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.html`, linha 13

  de:

  ```
  <br-tab (onTabItemClick)="onTabItemClick($event)">
  ```

  para:

  ```
  <br-tab style="--font-size-scale-up-02: var(--font-size-scale-up-01)" (onTabItemClick)="onTabItemClick($event)">
  ```

- **Valor depois:** font-size 16.8px = --font-size-scale-up-01: degrau da escala do DS, mas não o previsto para o rótulo da Tab.
- **Observável:** Abas com texto menor (do tamanho do texto dos botões); medir font-size dos botões .tab-item no shadow DOM.
- **Cláusula:** `componentes/tab__designer.md` (Especificações > ### Tipografia; linha 223; conferido literal: sim)

  > | Rótulo da *Tab*       | `--font-size-scale-up-02` | `--font-weight-medium`    |

- **Risco:** Baixo; verificado. Redefine o token só dentro de br-tab.

### T3-5 (ordem 5) — Select (lista suspensa)

- **Nível:** muito difícil · **Exige interação:** sim
- **Elemento:** govbr-custom-pagination br-select-pnip .br-select > div.br-list — lista suspensa dos selects "Exibir" e "Página" da paginação (light DOM)
- **Estado:** Rolar até a paginação → clicar no campo "Exibir" (ou "Página") para abrir a lista.
- **Conforme hoje (medido):** box-shadow da lista aberta rgba(0,0,0,0.16) 0 3px 6px 0 = --surface-shadow-md.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\shared\br-select\br-select.component.html`, linha 10

  de:

  ```
  <div class="br-list" tabindex="0" (keydown.enter)="onEnterKeyPress($event)">
  ```

  para:

  ```
  <div class="br-list" tabindex="0" style="box-shadow: var(--surface-shadow-lg)" (keydown.enter)="onEnterKeyPress($event)">
  ```

- **Valor depois:** rgba(0,0,0,0.16) 0 6px 6px 0 = --surface-shadow-lg: sombra do sistema, mas não a prevista para a superfície do select.
- **Observável:** Com a lista aberta, sombra mais deslocada para baixo; medir box-shadow de .br-select .br-list.
- **Cláusula:** `componentes/select__designer.md` (Especificações > ### Sombra; linha 363; conferido literal: sim)

  > | Superfície | `--surface-shadow-md` |

- **Risco:** Médio-baixo. A classe utilitária shadow-lg NÃO funciona aqui (a regra .br-select .br-list vence) — por isso estilo inline. Se o JS do BRSelect reescrever o atributo style da lista ao abrir/fechar, a sombra se perde (não observado no teste: a lista abre por classe). Afeta os dois selects da paginação (mesmo componente).

### T3-6 (ordem 6) — Input (ação interna)

- **Nível:** difícil · **Exige interação:** não
- **Elemento:** pnip-search-table-utils .br-input > button.br-button[aria-label="Buscar"] — botão circular de lupa dentro do campo "Pesquise aqui ..." (light DOM)
- **Estado:** inicial (campo de busca vazio; com texto o botão vira "Limpar")
- **Conforme hoje (medido):** botão 32×32 px (= --button-small, densidade alta), campo 32px.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\utils\components\search-table.utils.ts`, linha 17-18

  de:

  ```
  <button 
     class="br-button" 
  ```

  para:

  ```
  <button 
     class="br-button" 
     style="--button-size: var(--button-medium)" 
  ```

- **Valor depois:** botão 40×40 px = --button-medium (densidade padrão do Button): tamanho do sistema, mas a ação interna do input deve ser de densidade alta.
- **Observável:** Lupa num círculo maior que a altura do campo (40 px num campo de 32 px); medir width/height do botão.
- **Cláusula:** `componentes/input__designer.md` (Detalhamento dos itens > ### 4. Ação interna (Opcional); linha 86; conferido literal: sim)

  > Por padrão é utilizado um *Button* de enfase terciária do tipo circular sempre com densidade alta, e o ícone deve representar a ação a ser realizada na interação.

- **Risco:** Médio-baixo. A classe large do DS NÃO funciona aqui (a regra .br-input .br-button fixa --button-size), por isso a custom property inline. Diferença visual discreta (o círculo do terciário é transparente). O botão "Limpar" (linhas 26-33) fica como está.

## T4 — Estado e comportamento

### T4-1 (ordem 1) — Button (estado desabilitado)

- **Nível:** difícil · **Exige interação:** não
- **Elemento:** br-button[disabled][title^="Desassociar"] na coluna de ações da tabela (ícone vermelho user-times) → host + shadow DOM button.br-button
- **Estado:** inicial (aba Tramitando, perfil Coordenador: 8 botões "Desassociar" desabilitados nas linhas cujo status não é "Em análise analista")
- **Conforme hoje (medido):** opacity 0.45 (= --surface-opacity-md) e cursor not-allowed; o "Desassociar" habilitado da 1ª linha tem opacity 1.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.scss`, linha após 3 (acrescentar)

  de:

  ```
  (nada)
  ```

  para:

  ```
  br-button[disabled] {
     --disabled: 1;
  }
  ```

- **Valor depois:** opacity 1 nos botões desabilitados (o cursor continua not-allowed): o estado desabilitado deixa de ter tratamento visual.
- **Observável:** Os ícones "Desassociar" desabilitados ficam iguais ao habilitado (vermelho cheio); medir opacity do host/botão interno de br-button[disabled].
- **Cláusula:** `fundamentos-visuais/estados.md` (## Desabilitado > ### Especificação para Estado Desabilitado; linha 234; conferido literal: sim)

  > | background/foreground | opacity  | `--surface-opacity-md`  |

- **Risco:** Baixo. Escopo do componente: atinge todos os br-button desabilitados do template de processos (inclui "Assumir" desabilitado na aba Aguardando análise), não o "Limpar filtros" (outro componente). Padrão realista: styles.css já faz o mesmo com br-input[disabled] { --disabled: 0.9 }. O mesmo trecho literal aparece só uma vez (linha 234).

### T4-2 (ordem 2) — Tab (estado ativo)

- **Nível:** médio · **Exige interação:** não
- **Elemento:** br-tab > br-tab-item#TRAMITANDO (e o shadow DOM li.tab-item.active de br-tab)
- **Estado:** inicial
- **Conforme hoje (medido):** O item ativo é "Tramitando" (cor #0c326f + borda inferior 4px), que corresponde ao conteúdo exibido (colunas Analista/Téc. Adm., tag "Meus processos").
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.html`, linha 15

  de:

  ```
  <br-tab-item id="TRAMITANDO" title="Tramitando" is-active="true"/>
  ```

  para:

  ```
  <br-tab-item id="TRAMITANDO" title="Tramitando"/>
  ```

- **Observável:** Sem item marcado, o componente ativa o 1º: "Aguardando análise" aparece ativo, mas a lista continua sendo a de Tramitando (status inicial do componente = TRAMITANDO). Medir qual li.tab-item tem .active e comparar com o conteúdo.
- **Cláusula:** `componentes/tab__designer.md` (Detalhamento dos Itens > #### 1. Item da *Tab* (Obrigatório); linha 56; conferido literal: sim)

  > A - O Item da *Tab* Ativo tem a finalidade de mostrar ao usuário em qual aba ele se encontra.

- **Risco:** Médio-baixo. Verificado com um <br-tab> sintético: sem is-active o 1º item fica ativo e nenhum onTabItemClick é emitido na carga; clicar no item já ativo emite o evento (a navegação entre abas continua funcionando). Âncora complementar na mesma seção: "É importante ressaltar que este elemento possui dois estados obrigatórios, o ativo e o interativo."

### T4-3 (ordem 3) — Button (estado hover)

- **Nível:** muito difícil · **Exige interação:** sim
- **Elemento:** br-button "Voltar" (secundário, rodapé da página) → shadow DOM button.br-button.secondary
- **Estado:** Rolar até o fim da página → passar o mouse sobre "Voltar".
- **Conforme hoje (medido):** Em hover: background-image linear-gradient(rgba(19,81,180,0.16)…) — overlay da cor do primeiro plano com --surface-opacity-xs; cursor pointer.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\pages\portal-mpa\processos\processos.component.html`, linha 165

  de:

  ```
  <br-button label="Voltar" type="secondary" (click)="voltar()"/>
  ```

  para:

  ```
  <br-button label="Voltar" type="secondary" style="--hover: 0" (click)="voltar()"/>
  ```

- **Valor depois:** Overlay com opacidade 0 (rgba(19,81,180,0)): o hover deixa de ter feedback visual (o cursor continua pointer).
- **Observável:** Ao passar o mouse, "Voltar" não muda, enquanto "Exportar" (mesmo tipo) escurece levemente; medir background-image do botão interno em hover.
- **Cláusula:** `fundamentos-visuais/estados.md` (## *Hover* > ### Especificação para Estado *Hover*; linha 263; conferido literal: sim)

  > | background (Sobre um fundo Claro)  | opacity  | `--surface-opacity-xs` |

- **Risco:** Baixo; verificado.

### T4-4 (ordem 4) — Input (estado foco)

- **Nível:** muito difícil · **Exige interação:** sim
- **Elemento:** pnip-search-table-utils br-input#search → shadow DOM input — campo "Pesquise aqui ..."
- **Estado:** Clicar no campo de busca (ou chegar a ele por Tab).
- **Conforme hoje (medido):** Em foco: borda rgb(194,133,12) e box-shadow 0 0 0 2px rgb(194,133,12) = --gold-vivid-40 (foco tênue: --surface-width-md, solid).
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\utils\components\search-table.utils.ts`, linha 9

  de:

  ```
  <br-input 
  ```

  para:

  ```
  <br-input 
     style="--focus: var(--blue-warm-vivid-70)"
  ```

- **Valor depois:** Em foco: borda e anel rgb(19,81,180) = --blue-warm-vivid-70 (a cor interativa), não a cor de foco.
- **Observável:** Ao focar, o contorno do campo fica azul em vez de dourado, diferente do foco dos outros elementos (ex.: botões e abas por teclado); medir border-color/box-shadow do input focado.
- **Cláusula:** `fundamentos-visuais/estados.md` (## Foco > ### Especificação para Foco; linha 338; conferido literal: sim)

  > | border (Sobre um fundo Claro)  | color    | `--gold-vivid-40` |

- **Risco:** Baixo; verificado. Âncora complementar: input__designer.md, "Nesse estado a borda do campo assume cor e espessura diferenciadas". Pode ser lido por um auditor como questão de acessibilidade de foco; a regra violada é a cor de foco do DS.

### T4-5 (ordem 5) — Select / List (estado hover do item)

- **Nível:** muito difícil · **Exige interação:** sim
- **Elemento:** govbr-custom-pagination br-select-pnip .br-select .br-list > div.br-item — itens das listas "Exibir"/"Página" (light DOM)
- **Estado:** Rolar até a paginação → abrir "Exibir" → passar o mouse sobre um item não selecionado (ex.: "25").
- **Conforme hoje (medido):** Item em hover: background-image linear-gradient(rgba(51,51,51,0.16)…) (overlay gray-80 com --surface-opacity-xs).
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\app\shared\br-select\br-select.component.html`, linha 18-20

  de:

  ```
  <div class="br-item" [class.selected]="optionSelected &&
  ```

  para:

  ```
  <div class="br-item" style="--hover: 0" [class.selected]="optionSelected &&
  ```

- **Valor depois:** Overlay com opacidade 0: o item sob o mouse não muda.
- **Observável:** Com a lista aberta, mover o mouse pelos itens não produz realce (nas listas de filtro, que usam a mesma estrutura, o realce continua); medir background-image do .br-item em hover.
- **Cláusula:** `componentes/select__designer.md` (Comportamentos > ### 4. Estados > #### Estado *Hover*; linha 221; conferido literal: sim)

  > O estado *hover* ocorre sobre o item da *list* quando o usuário direcionar o *mouse* sobre ele.

- **Risco:** Baixo; verificado com --hover:0 no item (a regra .br-select .br-item redefine --hover, por isso a propriedade precisa ficar no próprio item). Afeta os dois selects da paginação.

### T4-6 (ordem 6) — Select / Item (estado selecionado)

- **Nível:** muito difícil · **Exige interação:** sim
- **Elemento:** .br-select .br-list .br-item.selected — item já escolhido ("10") na lista "Exibir" da paginação (light DOM)
- **Estado:** Rolar até a paginação → abrir "Exibir".
- **Conforme hoje (medido):** Item "10" com .selected: background rgb(38,112,232) = #2670e8 = --blue-warm-vivid-50, texto branco.
- **Mudança:** `F:\Dev Nath\TCC\pnip-mock\src\styles.css`, linha após 193 (acrescentar)

  de:

  ```
  (nada)
  ```

  para:

  ```
  .br-select .br-list .br-item.selected {
     background-color: transparent;
     color: inherit;
  }
  ```

- **Valor depois:** Item selecionado com fundo transparente e texto rgb(51,51,51): indistinguível dos demais.
- **Observável:** Ao abrir a lista, nenhum item aparece destacado embora o campo mostre 10; medir background-color do .br-item.selected.
- **Cláusula:** `fundamentos-visuais/estados.md` (## Selecionado > ### Especificação para Estado Selecionado; linha 430; conferido literal: sim)

  > | background/foreground | color    | `--blue-warm-vivid-50` |

- **Risco:** Baixo (só CSS; a classe .selected e o valor continuam). Por ser global, alcança qualquer .br-select da aplicação — nesta rota, só os da paginação têm .selected. Âncora complementar: select__designer.md, "O estado selecionado ocorre quando algum(ns) item(ns) da *list* estiver(em) selecionado(s)." Alternativa descartada: remover o binding [class.selected] (risco de o BRSelect não preencher o campo).
