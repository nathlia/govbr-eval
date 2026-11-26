# Candidatos de defeitos DS para a tela Processos (/pnip-d/portal-mpa/processos?mock-perfil=mpa)

Gerado por `gerar-candidatos.mjs` a partir de `candidatos.json` (mesmo conteúdo). Viewport 1280×900. Ordem dentro de cada nível = preferência.

## Fácil

### F-facil-1 — Tag (tag de interação persistente "Meus processos")

- **Elemento:** pnip-mpa-processos div.tab-panel span.br-tag.interaction (1ª ocorrência, texto "Meus processos") > span.text-truncate — light DOM
- **Estado:** inicial (aba Tramitando, perfil mpa)
- **Conforme hoje (medido):** Rótulo em uma única linha: span.text-truncate com white-space:nowrap, altura 24,3px dentro da superfície de 32px (height:32px).
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linha 29: <span class="text-truncate">Meus processos</span> → <span style="display:inline-block; max-width:64px; white-space:normal; line-height:1.2">Meus processos</span>. A superfície mantém height:32px.
- **Observável:** O rótulo quebra em duas linhas (altura do span > 32px) e o texto vaza acima/abaixo da superfície azul da tag; visível na captura sem medir nada.
- **Cláusula:** `componentes/tag__designer.md`

  > O componente *tag* possui uma altura fixa e por isso não é permitida mais de uma linha de texto ou ícone no mesmo componente.

- **Por que é realista:** Desenvolvedor limita a largura do rótulo para "economizar espaço" na linha de filtros e troca a classe de truncamento por estilo próprio.
- **Por que este nível:** Texto saindo da caixa é uma quebra visual óbvia para qualquer pessoa, sem conhecer o DS.

### F-facil-2 — Table (truncamento de célula)

- **Elemento:** div.br-table table tbody tr > td:nth-child(5) (coluna "Solicitante") — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** Células da coluna Solicitante sem truncamento: white-space:normal, scrollWidth == clientWidth (120 = 120); o texto quebra em linhas e aparece inteiro.
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linha 90: <td> (célula do solicitante) → <td style="max-width:90px; white-space:nowrap; overflow:hidden">. text-overflow continua "clip" (sem reticências).
- **Observável:** Nomes como "Pessoa Exemplo Dias / Barco Exemplo Alfa" aparecem cortados no meio de palavra, sem "…" e sem tooltip; scrollWidth > clientWidth e text-overflow:clip.
- **Cláusula:** `componentes/table__designer.md`

  > Os textos devem ser truncados exibindo as reticências no final. Ao passar o *mouse* sobre o texto truncado é revelado o texto completo pelo uso de *tooltip*.

- **Por que é realista:** Tentativa comum de reduzir a altura das linhas (hoje muito altas) cortando o texto com overflow:hidden, esquecendo text-overflow e title.
- **Por que este nível:** Texto cortado no meio da palavra é perceptível por qualquer leitor da tabela.

### F-facil-3 — Input (ação interna do campo de busca)

- **Elemento:** pnip-search-table-utils div.br-input > button.br-button[aria-label="Buscar"] (e o irmão [aria-label="Limpar"]) — light DOM, sobreposto ao br-input#search (shadow)
- **Estado:** inicial
- **Conforme hoje (medido):** Botão circular 32×32 (y=420) dentro do campo 233×32 (y=418): centrado verticalmente no campo (desvio de 2px), encostado à direita.
- **Mudança:** pnip-mock/src/app/utils/components/search-table.utils.ts: nos dois botões, [style.margin-top]="'-38px'" → [style.margin-top]="'-12px'".
- **Observável:** A lupa (e o "×" após digitar) fica abaixo do campo, a ~26px do lugar, fora da borda do input; o centro vertical do botão deixa de coincidir com o do campo.
- **Cláusula:** `componentes/input__designer.md`

  > | Ação interna                               | margin-top/bottom          | `--spacing-vertical-center` |

- **Por que é realista:** O posicionamento da ação depende de um margin-top negativo "mágico"; um ajuste de layout ou de densidade do campo desalinha o botão.
- **Por que este nível:** Ícone solto fora do campo de busca é quebra visível para qualquer pessoa.

### F-facil-4 — Button (secundário "Exportar")

- **Elemento:** br-button[label="Exportar"] → shadow: button.br-button.secondary
- **Estado:** inicial
- **Conforme hoje (medido):** Botão 118×40 com rótulo "Exportar" inteiro, padding-left/right 24px, borda pill completa.
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linha 9: <br-button type="secondary" label="Exportar" …> → acrescentar style="display:inline-block; width:72px; overflow:hidden" no host.
- **Observável:** Só ~72px do botão aparecem: o rótulo fica cortado ("Expor…" sem reticências) e falta a borda/arredondamento do lado direito.
- **Cláusula:** `componentes/button__designer.md`

  > **Importante:** o crescimento do botão deve acompanhar o tamanho do rótulo, porém as margens internas devem ser respeitadas.

- **Por que é realista:** Largura fixa dada a botões de cabeçalho para alinhar colunas, sem conferir o rótulo.
- **Por que este nível:** Botão com texto e borda cortados é quebra evidente.

### F-facil-5 — Tag (grupo de tags de filtro)

- **Elemento:** pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1 (colunas das tags "Aberto há", "Tipo de processo", "Status", "Espécie alvo", "Método de pesca", "Petrecho") — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** Espaço constante de 8px entre tags vizinhas (x: 92–247 | 255–469 | 477–604 | 612–789; 2ª linha 92–307 | 315–464). Observação: essas tags já têm borda (fora do DS em outra propriedade); a distribuição está conforme.
- **Mudança:** pnip-mock/src/app/utils/components/multiple-search-table.utils.ts, template: <div class="col-auto px-1" *ngFor="let p of params"> → <div class="col-auto px-1" style="margin-right:-28px" *ngFor="let p of params">.
- **Observável:** Cada tag de filtro passa a sobrepor ~20px da seguinte (bordas e ícones encavalados); espaçamento entre tags negativo.
- **Cláusula:** `componentes/tag__designer.md`

  > *Tags* podem estar agrupadas tanto horizontal quanto verticalmente mantendo a consistência nos espaços entre as *tags*.

- **Por que é realista:** Compactar a barra de filtros com margem negativa para caber em uma linha.
- **Por que este nível:** Elementos encavalados são vistos por qualquer pessoa.

### F-facil-6 — Button (área de proteção do "Voltar")

- **Elemento:** pnip-mpa-processos div.d-flex.justify-content-end.mt-4 > br-button[label="Voltar"] (shadow: button.br-button.secondary)
- **Estado:** inicial
- **Conforme hoje (medido):** Voltar em y=1885 (40px de altura), 24px abaixo da faixa de paginação (que termina em y≈1861); nenhuma sobreposição.
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linha 164: <div class="d-flex justify-content-end mt-4"> → <div class="d-flex justify-content-end" style="margin-top:-20px">.
- **Observável:** O botão Voltar sobe e cobre parte do seletor "Página" da paginação (caixas se intersectam); a paginação continua utilizável pela parte não coberta.
- **Cláusula:** `componentes/button__designer.md`

  > Quando o botão estiver próximo a algum outro componente, mantenha um espaçamento mínimo para que a o botão seja notado na tela e que sua área de interação não se confunda com as de outros componentes.

- **Por que é realista:** Ajuste de espaçamento vertical para "subir" o rodapé da página.
- **Por que este nível:** Botão encavalado em outro controle é quebra visível sem conhecer o DS.

## Médio

### F-medio-1 — Button (ênfase das ações da tabela)

- **Elemento:** div.br-table tbody br-button[title="Assinar"] → shadow: button.br-button
- **Estado:** inicial (3 linhas exibem "Assinar")
- **Conforme hoje (medido):** Ênfase terciária (classe br-button sem primary/secondary; fundo transparente, texto #1351B4), igual às demais ações da linha; nenhum botão primário na tela inicial.
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linha 118: <br-button *ngIf="podeAssinar(p)" title="Assinar" …> → acrescentar type="primary".
- **Observável:** Três botões primários azuis preenchidos ("Assinar") repetidos nas linhas, ao lado de ações terciárias; ênfase primária usada em ação de linha, não na ação principal da tela.
- **Cláusula:** `componentes/button__designer.md`

  > Utilize de forma limitada. Somente em ações estratégicas, voltadas para o objetivo principal de uma tela.

- **Por que é realista:** Querer destacar a ação "importante" de assinatura em cada linha.
- **Por que este nível:** Só destoa ao comparar com as outras ações da mesma linha/tela (hierarquia inconsistente).

### F-medio-2 — Button (arredondamento do secundário "Voltar")

- **Elemento:** botão "Voltar" (hoje br-button[label="Voltar"] → shadow button.br-button.secondary)
- **Estado:** inicial
- **Conforme hoje (medido):** border-radius pill (computado 1680px = 999em) igual ao "Exportar", ambos secundários.
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linha 165: <br-button label="Voltar" type="secondary" (click)="voltar()"/> → <button type="button" class="br-button secondary" style="border-radius:var(--surface-rounder-sm)" (click)="voltar()">Voltar</button> (classe do core, já carregada globalmente).
- **Observável:** Voltar com cantos de 4px enquanto Exportar (mesma ênfase) é pílula.
- **Cláusula:** `componentes/button__designer.md`

  > | Superfície (Padrão) | border-radius | `--surface-rounder-pill` |

- **Por que é realista:** Trocar o web component por markup do core e "padronizar" o raio com o de inputs/tags.
- **Por que este nível:** Percebido ao comparar os dois botões secundários da mesma página.

### F-medio-3 — Tag (arredondamento da tag de interação)

- **Elemento:** pnip-mpa-processos div.tab-panel span.br-tag.interaction (texto "Meus processos") — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** border-radius 4px (--surface-rounder-sm), igual às tags de filtro (4px) e às tags de filtro selecionado.
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linha 25: no <span class="br-tag interaction small" …> acrescentar [style.border-radius]="'var(--surface-rounder-pill)'".
- **Observável:** "Meus processos" em formato pílula enquanto as tags vizinhas têm cantos de 4px.
- **Cláusula:** `componentes/tag__designer.md`

  > ### Arredondamento [*Tag* de Interação] […] | Superfície | top-left-bottom-right | `--surface-rounder-sm` |

- **Por que é realista:** Confundir a tag de interação com a tag de contagem/ícone (que é pílula) ao "destacar" o filtro principal.
- **Por que este nível:** Só destoa ao comparar com as outras tags da mesma barra.

### F-medio-4 — Table (header da tabela)

- **Elemento:** div.br-table thead th com texto "Téc. Adm." (7ª coluna na aba Tramitando) — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** Todas as células do header com background rgb(240,240,240) = --gray-5.
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linha 72: <th class="text-blue-vivid-60 text-bold" scope="col" …>Téc. Adm.</th> → acrescentar style="background-color: var(--pure-0)".
- **Observável:** Uma célula do header branca (#FFFFFF), abrindo um "buraco" na faixa cinza do cabeçalho.
- **Cláusula:** `componentes/table__designer.md`

  > | Header da Tabela                  | background | `--gray-5`             |

- **Por que é realista:** Estilo inline copiado de outra tabela/coluna ao adicionar uma coluna nova.
- **Por que este nível:** Percebido pela inconsistência com as outras células do mesmo header.

### F-medio-5 — Pagination (select do módulo de exibição)

- **Elemento:** govbr-custom-pagination div.pagination-per-page (1º, rótulo "Exibir") br-select-pnip input#total — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** Inputs "Exibir" e "Página" sem contorno (border 1px solid transparente), densidade alta (32px).
- **Mudança:** pnip-mock/src/app/utils/components/govbr-custom-pagination/govbr-custom-pagination.component.html: no 1º <div class="pagination-per-page"> acrescentar a classe pp-exibir; em src/styles.css (global, pois o input pertence ao componente filho br-select-pnip): .pp-exibir input { border-color: var(--gray-40) !important; }.
- **Observável:** O input do "Exibir" com borda cinza visível (#888) enquanto o do "Página" continua sem contorno.
- **Cláusula:** `componentes/pagination__designer.md`

  > deve-se utilizar o componente *select* personalizado, onde o seu *input* (Campo de Entrada de Texto) estará em densidade alta, sem contorno e pré definido

- **Por que é realista:** Reaproveitar o select padrão de formulário (com borda) num dos módulos da paginação.
- **Por que este nível:** Fica evidente ao comparar os dois selects da mesma barra.

### F-medio-6 — Pagination (módulo de informação)

- **Elemento:** govbr-custom-pagination div.pagination-information ("1–9 de 9 itens") — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** Texto do módulo em rgb(51,51,51) (#333 = --color-secondary-08), igual aos rótulos "Exibir" e "Página".
- **Mudança:** pnip-mock/src/app/utils/components/govbr-custom-pagination/govbr-custom-pagination.component.html: <div class="pagination-information d-sm-flex" aria-live="polite"> → acrescentar style="color: var(--blue-warm-vivid-70)".
- **Observável:** O texto "1–9 de 9 itens" (não interativo) em azul #1351B4, a cor de interação, diferente dos demais textos de módulo.
- **Cláusula:** `componentes/pagination__designer.md`

  > | Texto Módulos                           | color      | `--color-secondary-08` |

- **Por que é realista:** Destacar o total de itens com a cor "da marca".
- **Por que este nível:** Só destoa comparando com os outros textos de módulo da mesma paginação.

## Difícil

### F-dificil-1 — Pagination (ícones das setas de navegação)

- **Elemento:** govbr-custom-pagination nav.br-pagination.small button.br-button.circle[aria-label="Página anterior"|"Página seguinte"] > i — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** Ícones fas fa-angle-left e fas fa-angle-right.
- **Mudança:** pnip-mock/src/app/utils/components/govbr-custom-pagination/govbr-custom-pagination.component.html: fa-angle-left → fa-chevron-left; fa-angle-right → fa-chevron-right.
- **Observável:** Classes dos ícones das setas = fa-chevron-*; traço mais longo/fino que o angle; a tela continua com aparência normal.
- **Cláusula:** `componentes/pagination__designer.md`

  > | Seta Lateral Esquerda       | <i class="angle-left"></i>  | `--icone-size-base` | angle-left           | […] | Seta Lateral Direita        | <i class="angle-right"></i> | `--icone-size-base` | angle-right          |

- **Por que é realista:** Trocar por chevron, que é o ícone usado no breadcrumb e em listas do DS.
- **Por que este nível:** Parece correto; só é erro diante da especificação de iconografia da paginação.

### F-dificil-2 — Avatar (letra, no sign-in do cabeçalho)

- **Elemento:** pnip-header button#avatar-dropdown-trigger span.br-avatar > span.content — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** Superfície 40×40 com border-radius 50% (circular), letra "U" bold 24,19px.
- **Mudança:** pnip-mock/src/app/layout/header/header.component.html, linha 7: <span class="content bg-orange-vivid-30 text-pure-0"> → acrescentar style="border-radius: var(--surface-rounder-sm)".
- **Observável:** Avatar quadrado com cantos de 4px (border-radius 4px) em vez de círculo.
- **Cláusula:** `componentes/avatar__designer.md`

  > A representação do usuário deve estar contida em uma superfície circular.

- **Por que é realista:** Uniformizar o avatar com o raio das tags/badges do cabeçalho.
- **Por que este nível:** Um avatar quadrado parece intencional; só é erro sabendo que o DS exige superfície circular.

### F-dificil-3 — Button (rótulo do terciário "Limpar filtros")

- **Elemento:** pnip-multiple-search-table-utils br-button[label="Limpar filtros"] → shadow: button.br-button
- **Estado:** inicial (desabilitado, mas visível)
- **Conforme hoje (medido):** text-transform: none ("Limpar filtros").
- **Mudança:** pnip-mock/src/app/utils/components/multiple-search-table.utils.ts, template: <br-button icon label="Limpar filtros" …> → acrescentar class="text-uppercase" (text-transform é herdado pelo shadow DOM; conferido no navegador).
- **Observável:** Rótulo renderizado "LIMPAR FILTROS" (text-transform: uppercase no botão interno).
- **Cláusula:** `componentes/button__designer.md`

  > | Rótulo (Padrão) | `--font-size-scale-up-01` | `--font-weight-semi-bold` |     `none`     |

- **Por que é realista:** Convenção de outros design systems (botões em caixa alta).
- **Por que este nível:** Caixa alta parece um estilo válido; só é erro pela especificação de text-transform do botão.

### F-dificil-4 — Table (espaçamento das linhas)

- **Elemento:** div.br-table table tbody td (todas as células do corpo) — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** padding 16px 24px (top/bottom = --spacing-scale-2x, left/right = --spacing-scale-3x): densidade padrão; header também 16px/24px.
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.scss: acrescentar .br-table .table tbody td { padding-top: 12px !important; padding-bottom: 12px !important; }.
- **Observável:** padding-top/bottom das células = 12px, valor que não corresponde a nenhuma densidade da tabela (8px alta, 16px padrão, 24px baixa).
- **Cláusula:** `componentes/table__designer.md`

  > | Linhas (Densidade Padrão)             | padding-top    |  `--spacing-scale-2x`  |

- **Por que é realista:** Compactar linhas muito altas com um valor "no olho".
- **Por que este nível:** A tabela continua com aparência normal; só a medição contra a tabela de espaçamentos revela o erro.

### F-dificil-5 — Estado interativo (link do nº do processo na tabela)

- **Elemento:** div.br-table tbody td a[role="button"] (nº do processo) — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** color rgb(19,81,180) = #1351B4 (--blue-warm-vivid-70).
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linha 87: <a [style.cursor]="'pointer'" role="button" …> → acrescentar class="text-blue-vivid-60".
- **Observável:** Links do nº do processo em #005EA2 (blue-vivid-60), outro azul fora da família de interação.
- **Cláusula:** `fundamentos-visuais/estados.md`

  > | background/foreground (Sobre um fundo Claro)  | color    | `--blue-warm-vivid-70` |

- **Por que é realista:** Reaproveitar a classe de cor usada no cabeçalho da própria tabela.
- **Por que este nível:** Continua parecendo um link azul; só o token exato da cor de interação denuncia.

### F-dificil-6 — Sign-in (superfície, ênfase secundária)

- **Elemento:** pnip-header button#avatar-dropdown-trigger.br-sign-in — light DOM
- **Estado:** inicial
- **Conforme hoje (medido):** background-color rgb(248,248,248) = --gray-2; superfície 40px de altura, pílula.
- **Mudança:** pnip-mock/src/app/layout/header/header.component.scss: acrescentar .br-sign-in { background-color: var(--blue-vivid-5) !important; } (mesmo azul-claro do selo de perfil).
- **Observável:** Superfície do sign-in em rgb(232,245,255) (azul-claro) em vez de #F8F8F8.
- **Cláusula:** `componentes/signin__designer.md`

  > ### Cores (ênfase secundária - fundo claro) […] | Superfície    | background color | `--gray-2`             |

- **Por que é realista:** Harmonizar o fundo do botão com o selo de perfil "SUPERVISOR".
- **Por que este nível:** O resultado parece coerente; só a tabela de cores do sign-in mostra o erro.

## Muito difícil

### F-muito-dificil-1 — Select / List (lista suspensa de opções do filtro)

- **Elemento:** pnip-multiple-search-table-utils div.br-select > div.br-list.d-block — light DOM
- **Estado:** clicar em qualquer tag de filtro (ex.: "Tipo de processo") para abrir a lista de opções
- **Conforme hoje (medido):** Lista flutuante (position:absolute, z-index 1) com box-shadow rgba(0,0,0,0.16) 0 3px 6px.
- **Mudança:** pnip-mock/src/app/utils/components/multiple-search-table.utils.ts, template: <div class="br-list d-block mt-1"> → <div class="br-list d-block mt-1" style="box-shadow:none">.
- **Observável:** Com a lista aberta, box-shadow: none; a lista flutua sobre a tabela sem sombra.
- **Cláusula:** `componentes/select__designer.md`

  > O componente *list* será apresentado flutuando sobre a tela e uma sombra deve ser utilizada para proporcionar contraste entre o componente e o conteúdo de tela ao fundo.

- **Por que é realista:** Remover a sombra para um visual "flat".
- **Por que este nível:** Só aparece ao abrir o filtro, e a ausência de sombra só é erro pela regra do select.

### F-muito-dificil-2 — Tag (tag de interação dispensável — filtro selecionado)

- **Elemento:** pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction > button.br-button.inverted.circle — light DOM
- **Estado:** abrir uma tag de filtro e escolher uma opção (ex.: Tipo de processo → "Certificação Higiênico-Sanitária")
- **Conforme hoje (medido):** Ordem ícone (x=104) → rótulo (x=132) → botão fechar (x=294, extremidade direita).
- **Mudança:** pnip-mock/src/app/utils/components/multiple-search-table.utils.ts, template da tag selecionada: mover <button class="br-button inverted circle" …> para antes de <i class="{{s.icon}} mr-1">.
- **Observável:** Botão "×" à esquerda do ícone e do rótulo, em vez de na extremidade direita da tag.
- **Cláusula:** `componentes/tag__designer.md`

  > | Tertiary-button            | `--spacing-horizontal-right`  |

- **Por que é realista:** Padrão de "chip" de outras bibliotecas com o fechar à esquerda.
- **Por que este nível:** A tag só existe após interação e a posição do botão só é erro pela anatomia/alinhamento da tag.

### F-muito-dificil-3 — Estado desabilitado (botão "Assumir")

- **Elemento:** div.br-table tbody br-button[title="Assumir processo"] → shadow: button.br-button
- **Estado:** clicar na aba "Aguardando análise" (os 9 botões "Assumir" ficam desabilitados para este perfil)
- **Conforme hoje (medido):** button disabled, opacity 0.45 (--surface-opacity-md), cursor not-allowed.
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linhas 121–127: remover o binding [disabled]="…" e, com a mesma condição, aplicar [style.pointer-events]="cond ? 'none' : null" no host (o clique continua sem efeito).
- **Observável:** Na aba Aguardando análise, os "Assumir" aparecem com opacity 1 e sem cursor not-allowed, iguais a botões habilitados, mas não respondem.
- **Cláusula:** `fundamentos-visuais/estados.md`

  > | background/foreground | opacity  | `--surface-opacity-md`  | […] | cursor                | cursor   | `not-allowed`           |

- **Por que é realista:** Bloquear o clique por CSS em vez de usar o atributo disabled.
- **Por que este nível:** Exige trocar de aba e saber como o DS especifica o estado desabilitado.

### F-muito-dificil-4 — Select (item selecionado na lista do "Exibir")

- **Elemento:** govbr-custom-pagination div.pagination-per-page br-select-pnip div.br-list > div.br-item.selected — light DOM
- **Estado:** clicar no input "Exibir" da paginação para abrir a lista (10/25/50/100)
- **Conforme hoje (medido):** Item selecionado ("10") com background rgb(38,112,232) = #2670E8 (--blue-warm-vivid-50) e texto branco.
- **Mudança:** pnip-mock/src/app/shared/br-select/br-select.component.ts (estilos do componente) ou src/styles.css: .br-select .br-item.selected { background-color: var(--blue-warm-vivid-70) !important; } (limitar a br-select-pnip se for global).
- **Observável:** Com a lista aberta, item selecionado em #1351B4 em vez de #2670E8.
- **Cláusula:** `fundamentos-visuais/estados.md`

  > | background/foreground | color    | `--blue-warm-vivid-50` |

- **Por que é realista:** Usar a cor "primária" do tema para o selecionado.
- **Por que este nível:** Requer abrir o select e conhecer o token do estado selecionado; visualmente continua "azul".

### F-muito-dificil-5 — Tab / estado de foco

- **Elemento:** br-tab → shadow: li.tab-item > button[data-panel] 
- **Estado:** navegar por teclado (Tab) até um item de aba
- **Conforme hoje (medido):** Foco: outline rgb(194,133,12) (#C2850C = --gold-vivid-40) dashed 4px, offset -4px.
- **Mudança:** pnip-mock/src/app/pages/portal-mpa/processos/processos.component.html, linha 13: <br-tab (onTabItemClick)="…"> → acrescentar style="--focus-style: solid; --focus: var(--blue-warm-vivid-70); --focus-color: var(--blue-warm-vivid-70)" (as variáveis atravessam o shadow DOM; conferido no navegador).
- **Observável:** Item de aba focado por teclado com contorno azul #1351B4 sólido em vez de dourado tracejado.
- **Cláusula:** `fundamentos-visuais/estados.md`

  > | border (Sobre um fundo Claro)  | color    | `--gold-vivid-40` | […] | border  | style    | `dashed`               |

- **Por que é realista:** Tematizar o foco com a cor da marca.
- **Por que este nível:** Só aparece navegando por teclado e só é erro pela especificação de foco do DS.

### F-muito-dificil-6 — List / estado hover (opções do filtro)

- **Elemento:** pnip-multiple-search-table-utils div.br-select div.br-list > div.br-item — light DOM
- **Estado:** abrir uma tag de filtro e passar o mouse sobre uma opção
- **Conforme hoje (medido):** Hover: background-image linear-gradient(rgba(51,51,51,0.16)…) — overlay da cor do primeiro plano (#333) com opacidade 0.16 (--surface-opacity-xs); fundo branco.
- **Mudança:** src/styles.css (global): pnip-multiple-search-table-utils .br-list .br-item:hover { background-image: none; background-color: var(--blue-warm-vivid-70); color: var(--pure-0); }
- **Observável:** Com o mouse sobre uma opção, o item fica azul sólido com texto branco (parece "selecionado"), sem overlay de 16%.
- **Cláusula:** `fundamentos-visuais/estados.md`

  > A cor do elemento *Overlay* será sempre a cor do Primeiro Plano do elemento *hover*. […] | background (Sobre um fundo Claro)  | opacity  | `--surface-opacity-xs` |

- **Por que é realista:** Hover "forte" para indicar clicabilidade.
- **Por que este nível:** Só aparece com mouse sobre a lista aberta e exige a regra de overlay do estado hover.

