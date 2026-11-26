# Conferência dos candidatos — Tela F

Conferente independente. Página: `/pnip-d/portal-mpa/processos?mock-perfil=mpa`, 1280×900, Chromium headless. Método em `metodo.md`.

## Resumo

| Nível | Aprovados | Reprovados (ordem) |
|---|---|---|
| facil | 4/6 | 1, 5 |
| medio | 5/6 | 1 |
| dificil | 4/6 | 1, 6 |
| muito-dificil | 4/6 | 3, 6 |

Total: 17/24 aprovados; 4 aprovados com risco de injeção.

Reprovações por critério: clausulaLiteral 0 · clausulaSustenta 4 · especificoDoDS 0 · conformeHoje 0 · observavel 1 · nivelCorreto 2 · realista 0 · injetavelNoFonte 1 · independente 0

## Tabela

| id | nível | ordem | clausulaLiteral | clausulaSustenta | especificoDoDS | conformeHoje | observavel | nivelCorreto | realista | injetavelNoFonte | independente | aprovado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-facil-1 | facil | 1 | sim | sim | sim | sim | sim | **NÃO** | sim | sim | sim | **não** |
| F-facil-2 | facil | 2 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-facil-3 | facil | 3 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-facil-4 | facil | 4 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-facil-5 | facil | 5 | sim | **NÃO** | sim | sim | sim | sim | sim | sim | sim | **não** |
| F-facil-6 | facil | 6 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-medio-1 | medio | 1 | sim | **NÃO** | sim | sim | sim | **NÃO** | sim | sim | sim | **não** |
| F-medio-2 | medio | 2 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-medio-3 | medio | 3 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-medio-4 | medio | 4 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-medio-5 | medio | 5 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim (risco) |
| F-medio-6 | medio | 6 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-dificil-1 | dificil | 1 | sim | **NÃO** | sim | sim | sim | sim | sim | sim | sim | **não** |
| F-dificil-2 | dificil | 2 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-dificil-3 | dificil | 3 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim (risco) |
| F-dificil-4 | dificil | 4 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-dificil-5 | dificil | 5 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-dificil-6 | dificil | 6 | sim | **NÃO** | sim | sim | sim | sim | sim | sim | sim | **não** |
| F-muito-dificil-1 | muito-dificil | 1 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-muito-dificil-2 | muito-dificil | 2 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim |
| F-muito-dificil-3 | muito-dificil | 3 | sim | sim | sim | sim | sim | sim | sim | **NÃO** | sim | **não** |
| F-muito-dificil-4 | muito-dificil | 4 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim (risco) |
| F-muito-dificil-5 | muito-dificil | 5 | sim | sim | sim | sim | sim | sim | sim | sim | sim | sim (risco) |
| F-muito-dificil-6 | muito-dificil | 6 | sim | sim | sim | sim | **NÃO** | sim | sim | sim | sim | **não** |

## Notas por candidato

### F-facil-1 — REPROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/tag__designer.md.
- **clausulaSustenta** (sim): tag__designer §4 Dimensões: altura fixa, "não é permitida mais de uma linha de texto" — normativo e aplicável à tag de interação.
- **especificoDoDS** (sim): Regra de anatomia/dimensão da tag do DS; não é critério WCAG/e-MAG.
- **conformeHoje** (sim): Medido: rótulo white-space:nowrap, 24px de altura dentro da tag de 32px (uma linha).
- **observavel** (sim): Simulado: rótulo passa a 2 linhas (2 caixas de linha) e a tag cresce para 40px (min-height:32px, não height fixa). O efeito descrito ("texto vaza acima/abaixo", superfície mantém 32px) NÃO ocorre; só ~4px de "processos" passam da borda direita.
- **nivelCorreto** (não): O que se vê é uma tag de 2 linhas e 40px (mais alta que as tags de filtro de 32px), sem vazamento evidente; não é quebra óbvia para leigo — seria médio/difícil, não fácil.
- **realista** (sim): Trocar a classe de truncamento por largura máxima própria é erro plausível.
- **injetavelNoFonte** (sim): processos.component.html linha 29 (template da rota), sem efeito funcional.
- **independente** (sim): Mesma tag de F-medio-3, mas outro elemento (span interno) e outra propriedade; não esconde o arredondamento.

### F-facil-2 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/table__designer.md.
- **clausulaSustenta** (sim): table__designer "Truncamento": recurso opcional, mas quando usado "devem ser truncados exibindo as reticências" + tooltip — corte sem reticências viola.
- **especificoDoDS** (sim): Regra de truncamento do componente Table; não é critério WCAG.
- **conformeHoje** (sim): Medido: coluna Solicitante (td 5) white-space:normal, scrollWidth=clientWidth=120, sem truncamento.
- **observavel** (sim): Simulado: nowrap+overflow hidden → scrollWidth 332/454/206 > clientWidth 120, text-overflow:clip, sem title; nomes cortados no meio.
- **nivelCorreto** (sim): Texto cortado no meio da palavra é perceptível sem conhecer o DS.
- **realista** (sim): Encurtar linhas altas com overflow:hidden esquecendo text-overflow é comum.
- **injetavelNoFonte** (sim): processos.component.html linha 90, estilo inline no td da rota.
- **independente** (sim): F-dificil-4 também toca td, mas propriedade diferente (padding vs largura/overflow).

### F-facil-3 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/input__designer.md.
- **clausulaSustenta** (sim): input__designer Espaçamentos: "Ação interna | margin-top/bottom | --spacing-vertical-center" — ação deve ficar centrada verticalmente no campo.
- **especificoDoDS** (sim): Anatomia/espaçamento do Input do DS.
- **conformeHoje** (sim): Medido: botão 32×32 em y=420, campo 233×32 em y=418; desvio de centro 2px.
- **observavel** (sim): Simulado (margin-top -12px): botão em y=430–462, campo em y=402–434; desvio de centro 28px, lupa abaixo da borda do campo.
- **nivelCorreto** (sim): Lupa solta fora do campo é visível para qualquer pessoa.
- **realista** (sim): Posição depende de margem negativa "mágica"; fácil de desajustar.
- **injetavelNoFonte** (sim): search-table.utils.ts (template do app, componente compartilhado da aplicação, não da biblioteca DS).
- **independente** (sim): Nenhum outro candidato toca a busca.

### F-facil-4 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/button__designer.md.
- **clausulaSustenta** (sim): button__designer: "o crescimento do botão deve acompanhar o tamanho do rótulo, porém as margens internas devem ser respeitadas" — largura fixa que corta o rótulo viola.
- **especificoDoDS** (sim): Regra de dimensionamento do Button do DS.
- **conformeHoje** (sim): Medido: botão 118×40, padding 24/24, rótulo "Exportar" inteiro.
- **observavel** (sim): Simulado: host 72px com overflow hidden; captura mostra "Expor" e lado direito sem borda.
- **nivelCorreto** (sim): Botão com rótulo e borda cortados é quebra evidente.
- **realista** (sim): Largura fixa em botões de cabeçalho é erro comum.
- **injetavelNoFonte** (sim): processos.component.html linha 9, estilo no host (não depende de alcançar o shadow root).
- **independente** (sim): F-medio-2 usa o Exportar como referência de comparação; o lado esquerdo continua pílula, então não esconde aquele defeito (registrado nas notas).

### F-facil-5 — REPROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/tag__designer.md.
- **clausulaSustenta** (não): tag__designer §5 exige "consistência nos espaços entre as tags"; o depois medido tem espaçamento uniforme de -20px entre todas as vizinhas — consistente. A cláusula não proíbe sobreposição; a violação alegada não decorre dela.
- **especificoDoDS** (sim): Regra de distribuição de tags do DS.
- **conformeHoje** (sim): Medido: gaps 8/8/8/8 px entre tags vizinhas.
- **observavel** (sim): Simulado: gaps -20/-20/-20/-20 px (tags encavaladas).
- **nivelCorreto** (sim): Sobreposição é visível para qualquer pessoa.
- **realista** (sim): Margem negativa para compactar a barra é plausível.
- **injetavelNoFonte** (sim): multiple-search-table.utils.ts (template do app).
- **independente** (sim): Tags de filtro continuam clicáveis; não esconde os candidatos que abrem a lista.

### F-facil-6 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/button__designer.md.
- **clausulaSustenta** (sim): button__designer §6 Área de Proteção: manter espaçamento mínimo para que a área de interação não se confunda com a de outros componentes — sobreposição viola.
- **especificoDoDS** (sim): Regra de área de proteção do Button do DS (não é critério WCAG-only).
- **conformeHoje** (sim): Medido: Voltar 24px abaixo da paginação (gap 24), sem interseção.
- **observavel** (sim): Simulado (margin-top -20px): gap -20px; caixa do Voltar intersecta o input "Página".
- **nivelCorreto** (sim): Botão encavalado em outro controle é visível sem conhecer o DS.
- **realista** (sim): Ajuste de margem para subir o rodapé.
- **injetavelNoFonte** (sim): processos.component.html linha 164 (contêiner da rota).
- **independente** (sim): F-medio-2 muda o Voltar (raio), outra propriedade; cobre parte do select "Página", referência de F-medio-5, mas não o select defeituoso (notas).

### F-medio-1 — REPROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/button__designer.md.
- **clausulaSustenta** (não): button__designer: "Utilize de forma limitada. Somente em ações estratégicas, voltadas para o objetivo principal de uma tela" é orientação de julgamento; numa lista de processos para supervisor, assinar pode ser defensavelmente a ação principal (a própria tela já tem "Assinar selecionados" primário). Não torna o depois inequivocamente violação.
- **especificoDoDS** (sim): Hierarquia de ênfase do Button do DS.
- **conformeHoje** (sim): Medido: 0 botões primários na tela; "Assinar" com classe br-button (terciário), fundo transparente.
- **observavel** (sim): Simulado recriando o host com type="primary" (a troca do atributo em tempo de execução não re-renderiza): 3 botões br-button primary, fundo rgb(19,81,180).
- **nivelCorreto** (não): Os três "Assinar" são consistentes entre si; o erro alegado vem da regra de uso da ênfase primária, não de inconsistência — seria difícil.
- **realista** (sim): Destacar ação importante em cada linha é plausível.
- **injetavelNoFonte** (sim): processos.component.html linha 118.
- **independente** (sim): Nenhum outro candidato toca esses botões.

### F-medio-2 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/button__designer.md.
- **clausulaSustenta** (sim): button__designer Arredondamento: "Superfície (Padrão) | border-radius | --surface-rounder-pill" — tabela de especificação normativa.
- **especificoDoDS** (sim): Token de arredondamento do DS.
- **conformeHoje** (sim): Medido: Voltar e Exportar com border-radius 1680px (pílula).
- **observavel** (sim): Simulado (botão do core com raio sm): Voltar 4px, Exportar 1680px; borda/cor/altura/padding iguais aos do web component.
- **nivelCorreto** (sim): Percebido ao comparar os dois secundários da mesma página.
- **realista** (sim): Trocar o web component por markup do core e "padronizar" o raio é plausível.
- **injetavelNoFonte** (sim): processos.component.html linha 165; classe do core já carregada globalmente (conferido: estilo aplicado).
- **independente** (sim): F-facil-6 move o contêiner (margem) e F-facil-4 corta o lado direito do Exportar; nenhum esconde o raio de 4px nem a pílula do lado esquerdo do Exportar.

### F-medio-3 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/tag__designer.md.
- **clausulaSustenta** (sim): tag__designer "Arredondamento [Tag de Interação] | Superfície | --surface-rounder-sm"; "Meus processos" é tag de interação persistente.
- **especificoDoDS** (sim): Token de arredondamento da tag do DS.
- **conformeHoje** (sim): Medido: "Meus processos" 4px, tags de filtro 4px.
- **observavel** (sim): Simulado: "Meus processos" com raio pílula (16783px) enquanto as vizinhas seguem 4px.
- **nivelCorreto** (sim): Inconsistência de forma entre tags da mesma barra.
- **realista** (sim): Confundir com a tag de contagem/ícone (pílula) é plausível.
- **injetavelNoFonte** (sim): processos.component.html linha 25.
- **independente** (sim): F-facil-1 mexe no span interno da mesma tag (outra propriedade).

### F-medio-4 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/table__designer.md.
- **clausulaSustenta** (sim): table__designer Cores: "Header da Tabela | background | --gray-5".
- **especificoDoDS** (sim): Token de cor do header da Table.
- **conformeHoje** (sim): Medido: todas as 9 th com rgb(240,240,240).
- **observavel** (sim): Simulado: th "Téc. Adm." rgb(255,255,255), demais rgb(240,240,240).
- **nivelCorreto** (sim): Percebido pela inconsistência com as outras células do mesmo header.
- **realista** (sim): Estilo inline copiado ao adicionar coluna.
- **injetavelNoFonte** (sim): processos.component.html linha 72.
- **independente** (sim): Nenhum outro candidato toca o fundo do header.

### F-medio-5 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/pagination__designer.md.
- **clausulaSustenta** (sim): pagination__designer: nos módulos com escolha, "deve-se utilizar o componente select personalizado, onde o seu input ... estará em densidade alta, sem contorno".
- **especificoDoDS** (sim): Composição da paginação do DS.
- **conformeHoje** (sim): Medido: inputs "total" e "page" com border 1px solid transparente, 32px.
- **observavel** (sim): Simulado: input do "Exibir" com borda rgb(136,136,136); "Página" segue transparente.
- **nivelCorreto** (sim): Evidente ao comparar os dois selects da mesma barra.
- **realista** (sim): Reaproveitar select de formulário com borda.
- **injetavelNoFonte** (sim): Classe no template da paginação + regra em src/styles.css (app). RISCO: depende de estilo global alcançar o input do componente filho br-select-pnip.
- **independente** (sim): F-muito-dificil-4 usa o mesmo select, mas outro elemento (item da lista) e outra propriedade.
- **risco**: depende de estilo global alcançar o input do componente filho br-select-pnip.

### F-medio-6 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/pagination__designer.md.
- **clausulaSustenta** (sim): pagination__designer Cores/Interativo: "Texto Módulos | color | --color-secondary-08"; a informação "1–9 de 9 itens" é texto de módulo não interativo.
- **especificoDoDS** (sim): Token de cor da paginação.
- **conformeHoje** (sim): Medido: texto rgb(51,51,51) = --color-secondary-08 (#333), igual aos rótulos Exibir/Página.
- **observavel** (sim): Simulado: texto rgb(19,81,180) enquanto rótulos seguem rgb(51,51,51).
- **nivelCorreto** (sim): Só destoa comparando com os outros textos da mesma paginação.
- **realista** (sim): Destacar o total com a cor "da marca".
- **injetavelNoFonte** (sim): govbr-custom-pagination.component.html (template do app).
- **independente** (sim): Nenhum outro candidato toca esse texto.

### F-dificil-1 — REPROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/pagination__designer.md.
- **clausulaSustenta** (não): A tabela de iconografia da paginação pede angle-left/right, mas fundamentos-visuais/iconografia.md (tabela de ícones por ação, "É fundamental que ... utilizem os ícones abaixo com mesma ação") atribui fa-chevron-left a "Voltar" e fa-chevron-right a "Avançar". O depois é defensável pela documentação: há contradição.
- **especificoDoDS** (sim): Iconografia do DS.
- **conformeHoje** (sim): Medido: classes "fas fa-angle-left" e "fas fa-angle-right".
- **observavel** (sim): Simulado: classes passam a fa-chevron-*; mensurável no DOM.
- **nivelCorreto** (sim): Parece correto; só a especificação revela.
- **realista** (sim): Chevron é usado em outros componentes do DS.
- **injetavelNoFonte** (sim): govbr-custom-pagination.component.html.
- **independente** (sim): Nenhum outro candidato toca as setas.

### F-dificil-2 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/avatar__designer.md.
- **clausulaSustenta** (sim): avatar__designer "1. Superfície circular (Obrigatório)": "A representação do usuário deve estar contida em uma superfície circular".
- **especificoDoDS** (sim): Anatomia do Avatar do DS.
- **conformeHoje** (sim): Medido: span.content 40×40, border-radius 50%.
- **observavel** (sim): Simulado: border-radius 4px (quadrado arredondado).
- **nivelCorreto** (sim): Avatar quadrado parece intencional; só a regra do DS revela.
- **realista** (sim): Uniformizar raio com selos/tags do cabeçalho.
- **injetavelNoFonte** (sim): header.component.html linha 7 (layout do app), estilo inline.
- **independente** (sim): F-dificil-6 toca o botão que contém o avatar, outro elemento/propriedade.

### F-dificil-3 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/button__designer.md.
- **clausulaSustenta** (sim): button__designer Tipografia: "Rótulo (Padrão) ... Text-transform none".
- **especificoDoDS** (sim): Tipografia do Button do DS.
- **conformeHoje** (sim): Medido: botão interno text-transform none, "Limpar filtros" (desabilitado, opacidade 0.45, visível).
- **observavel** (sim): Simulado (classe text-uppercase no host): botão interno text-transform uppercase, "LIMPAR FILTROS".
- **nivelCorreto** (sim): Caixa alta parece escolha de estilo; só a especificação revela.
- **realista** (sim): Convenção de outros design systems.
- **injetavelNoFonte** (sim): multiple-search-table.utils.ts. RISCO: depende de text-transform ser herdado para dentro do shadow root (funcionou no navegador).
- **independente** (sim): Nenhum outro candidato toca esse rótulo.
- **risco**: depende de text-transform ser herdado para dentro do shadow root (funcionou no navegador).

### F-dificil-4 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/table__designer.md.
- **clausulaSustenta** (sim): table__designer Espaçamentos: Linhas padrão 2x (16px), baixa 3x (24px), alta base (8px); 12px não corresponde a nenhuma densidade.
- **especificoDoDS** (sim): Tokens de densidade da Table.
- **conformeHoje** (sim): Medido: td 16px 24px; th 16px 24px (densidade padrão).
- **observavel** (sim): Simulado: td 12px 24px; th segue 16px 24px.
- **nivelCorreto** (sim): Tabela continua com aparência normal; só a medição revela.
- **realista** (sim): Compactar linhas "no olho".
- **injetavelNoFonte** (sim): processos.component.scss (estilo da rota; td está no template da rota, encapsulamento emulado alcança).
- **independente** (sim): F-facil-2 toca td da coluna 5 em outras propriedades.

### F-dificil-5 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: fundamentos-visuais/estados.md.
- **clausulaSustenta** (sim): estados.md "Especificação para Estado Interativo": background/foreground sobre fundo claro --blue-warm-vivid-70; o link do nº do processo é elemento interativo.
- **especificoDoDS** (sim): Token da cor de interação do DS.
- **conformeHoje** (sim): Medido: 9 links com rgb(19,81,180) = #1351B4.
- **observavel** (sim): Simulado: links rgb(0,94,162) = #005EA2.
- **nivelCorreto** (sim): Continua parecendo link azul; só o token revela.
- **realista** (sim): A própria tabela usa text-blue-vivid-60 no header.
- **injetavelNoFonte** (sim): processos.component.html linha 87.
- **independente** (sim): Nenhum outro candidato toca esses links.

### F-dificil-6 — REPROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/signin__designer.md.
- **clausulaSustenta** (não): A tabela de cores é do Sign-in (botão de autenticar). header__designer diz que o botão de autenticar "É apresentado apenas quando o usuário estiver deslogado. Após o login, ele será substituído pelo Avatar." O elemento medido é o gatilho do usuário logado; nada estabelece que ele seja um sign-in de ênfase secundária. A cláusula não é normativa para este caso.
- **especificoDoDS** (sim): Cor de componente do DS.
- **conformeHoje** (sim): Medido: background rgb(248,248,248), 40px, pílula.
- **observavel** (sim): Simulado: background rgb(232,245,255).
- **nivelCorreto** (sim): Parece coerente; só uma tabela de cores revelaria.
- **realista** (sim): Harmonizar com o selo de perfil.
- **injetavelNoFonte** (sim): header.component.scss (o botão está no template do header).
- **independente** (sim): F-dificil-2 toca o avatar interno (outro elemento).

### F-muito-dificil-1 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/select__designer.md.
- **clausulaSustenta** (sim): select__designer "Sombra no componente list": "uma sombra deve ser utilizada"; especificação Sombra Superfície --surface-shadow-md.
- **especificoDoDS** (sim): Elevação do Select/List do DS.
- **conformeHoje** (sim): Medido com a lista aberta (Tipo de processo): position absolute, z-index 1, box-shadow rgba(0,0,0,0.16) 0 3px 6px. Fechada, a lista não existe.
- **observavel** (sim): Simulado (estilo inline): box-shadow none com a lista aberta.
- **nivelCorreto** (sim): Exige abrir o filtro e a regra do select.
- **realista** (sim): Visual "flat".
- **injetavelNoFonte** (sim): multiple-search-table.utils.ts, estilo inline (vence a regra do DS).
- **independente** (sim): F-muito-dificil-6 toca itens da mesma lista, outra propriedade; F-muito-dificil-2 usa a lista só como caminho.

### F-muito-dificil-2 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: componentes/tag__designer.md.
- **clausulaSustenta** (sim): tag__designer "Alinhamento [tag de Interação]": Icon --spacing-horizontal-left, Tertiary-button --spacing-horizontal-right — o botão fechar fica à direita.
- **especificoDoDS** (sim): Anatomia/alinhamento da tag do DS.
- **conformeHoje** (sim): Medido após selecionar a 1ª opção: ícone x=104, rótulo x=132, fechar x=294 (extremidade direita).
- **observavel** (sim): Simulado: fechar x=116, ícone x=118, rótulo x=172; o botão continua removendo o filtro.
- **nivelCorreto** (sim): A tag só existe após interação e a posição só é erro pela especificação.
- **realista** (sim): Padrão "chip" de outras bibliotecas.
- **injetavelNoFonte** (sim): multiple-search-table.utils.ts (reordenar elementos do template), função preservada.
- **independente** (sim): Nenhum outro candidato toca a tag selecionada.

### F-muito-dificil-3 — REPROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: fundamentos-visuais/estados.md.
- **clausulaSustenta** (sim): estados.md "Especificação para Estado Desabilitado": opacity --surface-opacity-md, cursor not-allowed.
- **especificoDoDS** (sim): Tokens do estado desabilitado do DS.
- **conformeHoje** (sim): Medido na aba Aguardando análise: 9 "Assumir" disabled, opacity 0.45, cursor not-allowed (na aba inicial não existem).
- **observavel** (sim): Simulado: opacity 1, cursor pointer; clique de mouse bloqueado.
- **nivelCorreto** (sim): Exige trocar de aba e conhecer a especificação.
- **realista** (sim): Bloquear por CSS em vez de disabled.
- **injetavelNoFonte** (não): A mudança quebra a função: sem disabled o botão interno recebe foco e Enter executa assumirProcesso — medido: a página navegou para /processos/alteracao-certificado/… com um perfil para o qual a ação estava bloqueada. "O clique continua sem efeito" só vale para mouse.
- **independente** (sim): F-muito-dificil-5 foca o item de aba, não toca os botões.

### F-muito-dificil-4 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: fundamentos-visuais/estados.md.
- **clausulaSustenta** (sim): estados.md "Especificação para Estado Selecionado": background/foreground --blue-warm-vivid-50.
- **especificoDoDS** (sim): Token do estado selecionado do DS.
- **conformeHoje** (sim): Medido com a lista do "Exibir" aberta: item "10" selecionado, background rgb(38,112,232) = #2670E8, texto branco.
- **observavel** (sim): Simulado: background rgb(19,81,180) = #1351B4.
- **nivelCorreto** (sim): Exige abrir o select e conhecer o token; visualmente continua azul.
- **realista** (sim): Usar a cor primária do tema.
- **injetavelNoFonte** (sim): src/styles.css ou estilos de br-select.component.ts (componente do app, não a biblioteca). RISCO: estilo global alcançando o componente filho; regra global também atinge o select "Página".
- **independente** (sim): F-medio-5 toca o input do mesmo select (outro elemento/propriedade).
- **risco**: estilo global alcançando o componente filho; regra global também atinge o select "Página".

### F-muito-dificil-5 — APROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: fundamentos-visuais/estados.md.
- **clausulaSustenta** (sim): estados.md "Especificação para Foco": border fundo claro --gold-vivid-40; "Especificação para Estado Foco": style dashed.
- **especificoDoDS** (sim): Cor/estilo do foco do DS; o foco continua visível (WCAG 2.4.7 atendido), então é só do DS.
- **conformeHoje** (sim): Medido via Tab: botão "Aguardando análise" no shadow de br-tab com outline rgb(194,133,12) dashed 4px, offset -4px.
- **observavel** (sim): Simulado (variáveis no host): outline rgb(19,81,180) solid 4px.
- **nivelCorreto** (sim): Só aparece com teclado e só é erro pela especificação.
- **realista** (sim): Tematizar o foco com a cor da marca.
- **injetavelNoFonte** (sim): processos.component.html linha 13 (style no host). RISCO: depende de custom properties atravessarem o shadow root de br-tab (funcionou no navegador).
- **independente** (sim): Nenhum outro candidato toca o foco das abas.
- **risco**: depende de custom properties atravessarem o shadow root de br-tab (funcionou no navegador).

### F-muito-dificil-6 — REPROVADO

- **clausulaLiteral** (sim): Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json). Arquivo: fundamentos-visuais/estados.md.
- **clausulaSustenta** (sim): estados.md "Especificação para Estado Hover": overlay da cor do primeiro plano, opacity --surface-opacity-xs — um hover sem overlay violaria.
- **especificoDoDS** (sim): Especificação de estado do DS.
- **conformeHoje** (sim): Medido com a lista aberta e mouse sobre o 2º item: background-image linear-gradient(rgba(51,51,51,0.16)…), fundo branco, rótulo #333.
- **observavel** (não): A regra proposta perde em especificidade para a do DS (.br-select .br-item:not([disabled]):not(:disabled):hover). Simulado: o overlay rgba(51,51,51,0.16) permanece, fundo fica rgb(19,81,180) e o rótulo continua rgb(51,51,51). O depois descrito ("sem overlay", texto branco) não ocorre, e o resultado real não viola a cláusula citada (overlay intacto).
- **nivelCorreto** (sim): Exige abrir a lista e passar o mouse.
- **realista** (sim): Hover "forte" é plausível.
- **injetavelNoFonte** (sim): src/styles.css (app). RISCO: estilo global sobre itens do DS.
- **independente** (sim): F-muito-dificil-1 toca a sombra da mesma lista (outra propriedade).
- **risco**: estilo global sobre itens do DS.

## Notas de independência entre aprovados

- F-facil-4 corta o lado direito do Exportar, que é a referência de comparação de F-medio-2; o lado esquerdo continua pílula, então F-medio-2 segue observável.
- F-facil-6 faz o Voltar cobrir parte do select "Página", referência de comparação de F-medio-5; o select defeituoso ("Exibir") não é coberto.
- F-medio-5 e F-muito-dificil-4 estão no mesmo select "Exibir", em elementos e propriedades diferentes.
- Componentes compartilhados do app (search-table, multiple-search-table, paginação, header, br-select) são código da aplicação, não da biblioteca DS; mudá-los afeta outras rotas da mesma cópia /pnip-d/, não a página medida de outro modo.
