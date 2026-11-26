// Gera veredictos.json e veredictos.md a partir dos julgamentos registrados abaixo.
// Evidências vêm de clausulas.json, medidas.json, medidas-extra.json e medidas-md3-teclado.json.
import fs from 'node:fs';
const OUT = 'F:/Dev Nath/TCC/.tmp-eval/tela-f-selada/conferencia';
const cands = JSON.parse(fs.readFileSync('F:/Dev Nath/TCC/.tmp-eval/tela-f-selada/selecao/candidatos.json', 'utf8'));
const K = ['clausulaLiteral', 'clausulaSustenta', 'especificoDoDS', 'conformeHoje', 'observavel', 'nivelCorreto', 'realista', 'injetavelNoFonte', 'independente'];
const s = (ok, evidencia) => ({ ok, evidencia });
const LIT = 'Trecho encontrado literalmente no arquivo citado (todas as partes separadas por "[…]"; ver clausulas.json).';

const V = {
  'F-facil-1': {
    clausulaSustenta: s(true, 'tag__designer §4 Dimensões: altura fixa, "não é permitida mais de uma linha de texto" — normativo e aplicável à tag de interação.'),
    especificoDoDS: s(true, 'Regra de anatomia/dimensão da tag do DS; não é critério WCAG/e-MAG.'),
    conformeHoje: s(true, 'Medido: rótulo white-space:nowrap, 24px de altura dentro da tag de 32px (uma linha).'),
    observavel: s(true, 'Simulado: rótulo passa a 2 linhas (2 caixas de linha) e a tag cresce para 40px (min-height:32px, não height fixa). O efeito descrito ("texto vaza acima/abaixo", superfície mantém 32px) NÃO ocorre; só ~4px de "processos" passam da borda direita.'),
    nivelCorreto: s(false, 'O que se vê é uma tag de 2 linhas e 40px (mais alta que as tags de filtro de 32px), sem vazamento evidente; não é quebra óbvia para leigo — seria médio/difícil, não fácil.'),
    realista: s(true, 'Trocar a classe de truncamento por largura máxima própria é erro plausível.'),
    injetavelNoFonte: s(true, 'processos.component.html linha 29 (template da rota), sem efeito funcional.'),
    independente: s(true, 'Mesma tag de F-medio-3, mas outro elemento (span interno) e outra propriedade; não esconde o arredondamento.'),
  },
  'F-facil-2': {
    clausulaSustenta: s(true, 'table__designer "Truncamento": recurso opcional, mas quando usado "devem ser truncados exibindo as reticências" + tooltip — corte sem reticências viola.'),
    especificoDoDS: s(true, 'Regra de truncamento do componente Table; não é critério WCAG.'),
    conformeHoje: s(true, 'Medido: coluna Solicitante (td 5) white-space:normal, scrollWidth=clientWidth=120, sem truncamento.'),
    observavel: s(true, 'Simulado: nowrap+overflow hidden → scrollWidth 332/454/206 > clientWidth 120, text-overflow:clip, sem title; nomes cortados no meio.'),
    nivelCorreto: s(true, 'Texto cortado no meio da palavra é perceptível sem conhecer o DS.'),
    realista: s(true, 'Encurtar linhas altas com overflow:hidden esquecendo text-overflow é comum.'),
    injetavelNoFonte: s(true, 'processos.component.html linha 90, estilo inline no td da rota.'),
    independente: s(true, 'F-dificil-4 também toca td, mas propriedade diferente (padding vs largura/overflow).'),
  },
  'F-facil-3': {
    clausulaSustenta: s(true, 'input__designer Espaçamentos: "Ação interna | margin-top/bottom | --spacing-vertical-center" — ação deve ficar centrada verticalmente no campo.'),
    especificoDoDS: s(true, 'Anatomia/espaçamento do Input do DS.'),
    conformeHoje: s(true, 'Medido: botão 32×32 em y=420, campo 233×32 em y=418; desvio de centro 2px.'),
    observavel: s(true, 'Simulado (margin-top -12px): botão em y=430–462, campo em y=402–434; desvio de centro 28px, lupa abaixo da borda do campo.'),
    nivelCorreto: s(true, 'Lupa solta fora do campo é visível para qualquer pessoa.'),
    realista: s(true, 'Posição depende de margem negativa "mágica"; fácil de desajustar.'),
    injetavelNoFonte: s(true, 'search-table.utils.ts (template do app, componente compartilhado da aplicação, não da biblioteca DS).'),
    independente: s(true, 'Nenhum outro candidato toca a busca.'),
  },
  'F-facil-4': {
    clausulaSustenta: s(true, 'button__designer: "o crescimento do botão deve acompanhar o tamanho do rótulo, porém as margens internas devem ser respeitadas" — largura fixa que corta o rótulo viola.'),
    especificoDoDS: s(true, 'Regra de dimensionamento do Button do DS.'),
    conformeHoje: s(true, 'Medido: botão 118×40, padding 24/24, rótulo "Exportar" inteiro.'),
    observavel: s(true, 'Simulado: host 72px com overflow hidden; captura mostra "Expor" e lado direito sem borda.'),
    nivelCorreto: s(true, 'Botão com rótulo e borda cortados é quebra evidente.'),
    realista: s(true, 'Largura fixa em botões de cabeçalho é erro comum.'),
    injetavelNoFonte: s(true, 'processos.component.html linha 9, estilo no host (não depende de alcançar o shadow root).'),
    independente: s(true, 'F-medio-2 usa o Exportar como referência de comparação; o lado esquerdo continua pílula, então não esconde aquele defeito (registrado nas notas).'),
  },
  'F-facil-5': {
    clausulaSustenta: s(false, 'tag__designer §5 exige "consistência nos espaços entre as tags"; o depois medido tem espaçamento uniforme de -20px entre todas as vizinhas — consistente. A cláusula não proíbe sobreposição; a violação alegada não decorre dela.'),
    especificoDoDS: s(true, 'Regra de distribuição de tags do DS.'),
    conformeHoje: s(true, 'Medido: gaps 8/8/8/8 px entre tags vizinhas.'),
    observavel: s(true, 'Simulado: gaps -20/-20/-20/-20 px (tags encavaladas).'),
    nivelCorreto: s(true, 'Sobreposição é visível para qualquer pessoa.'),
    realista: s(true, 'Margem negativa para compactar a barra é plausível.'),
    injetavelNoFonte: s(true, 'multiple-search-table.utils.ts (template do app).'),
    independente: s(true, 'Tags de filtro continuam clicáveis; não esconde os candidatos que abrem a lista.'),
  },
  'F-facil-6': {
    clausulaSustenta: s(true, 'button__designer §6 Área de Proteção: manter espaçamento mínimo para que a área de interação não se confunda com a de outros componentes — sobreposição viola.'),
    especificoDoDS: s(true, 'Regra de área de proteção do Button do DS (não é critério WCAG-only).'),
    conformeHoje: s(true, 'Medido: Voltar 24px abaixo da paginação (gap 24), sem interseção.'),
    observavel: s(true, 'Simulado (margin-top -20px): gap -20px; caixa do Voltar intersecta o input "Página".'),
    nivelCorreto: s(true, 'Botão encavalado em outro controle é visível sem conhecer o DS.'),
    realista: s(true, 'Ajuste de margem para subir o rodapé.'),
    injetavelNoFonte: s(true, 'processos.component.html linha 164 (contêiner da rota).'),
    independente: s(true, 'F-medio-2 muda o Voltar (raio), outra propriedade; cobre parte do select "Página", referência de F-medio-5, mas não o select defeituoso (notas).'),
  },
  'F-medio-1': {
    clausulaSustenta: s(false, 'button__designer: "Utilize de forma limitada. Somente em ações estratégicas, voltadas para o objetivo principal de uma tela" é orientação de julgamento; numa lista de processos para supervisor, assinar pode ser defensavelmente a ação principal (a própria tela já tem "Assinar selecionados" primário). Não torna o depois inequivocamente violação.'),
    especificoDoDS: s(true, 'Hierarquia de ênfase do Button do DS.'),
    conformeHoje: s(true, 'Medido: 0 botões primários na tela; "Assinar" com classe br-button (terciário), fundo transparente.'),
    observavel: s(true, 'Simulado recriando o host com type="primary" (a troca do atributo em tempo de execução não re-renderiza): 3 botões br-button primary, fundo rgb(19,81,180).'),
    nivelCorreto: s(false, 'Os três "Assinar" são consistentes entre si; o erro alegado vem da regra de uso da ênfase primária, não de inconsistência — seria difícil.'),
    realista: s(true, 'Destacar ação importante em cada linha é plausível.'),
    injetavelNoFonte: s(true, 'processos.component.html linha 118.'),
    independente: s(true, 'Nenhum outro candidato toca esses botões.'),
  },
  'F-medio-2': {
    clausulaSustenta: s(true, 'button__designer Arredondamento: "Superfície (Padrão) | border-radius | --surface-rounder-pill" — tabela de especificação normativa.'),
    especificoDoDS: s(true, 'Token de arredondamento do DS.'),
    conformeHoje: s(true, 'Medido: Voltar e Exportar com border-radius 1680px (pílula).'),
    observavel: s(true, 'Simulado (botão do core com raio sm): Voltar 4px, Exportar 1680px; borda/cor/altura/padding iguais aos do web component.'),
    nivelCorreto: s(true, 'Percebido ao comparar os dois secundários da mesma página.'),
    realista: s(true, 'Trocar o web component por markup do core e "padronizar" o raio é plausível.'),
    injetavelNoFonte: s(true, 'processos.component.html linha 165; classe do core já carregada globalmente (conferido: estilo aplicado).'),
    independente: s(true, 'F-facil-6 move o contêiner (margem) e F-facil-4 corta o lado direito do Exportar; nenhum esconde o raio de 4px nem a pílula do lado esquerdo do Exportar.'),
  },
  'F-medio-3': {
    clausulaSustenta: s(true, 'tag__designer "Arredondamento [Tag de Interação] | Superfície | --surface-rounder-sm"; "Meus processos" é tag de interação persistente.'),
    especificoDoDS: s(true, 'Token de arredondamento da tag do DS.'),
    conformeHoje: s(true, 'Medido: "Meus processos" 4px, tags de filtro 4px.'),
    observavel: s(true, 'Simulado: "Meus processos" com raio pílula (16783px) enquanto as vizinhas seguem 4px.'),
    nivelCorreto: s(true, 'Inconsistência de forma entre tags da mesma barra.'),
    realista: s(true, 'Confundir com a tag de contagem/ícone (pílula) é plausível.'),
    injetavelNoFonte: s(true, 'processos.component.html linha 25.'),
    independente: s(true, 'F-facil-1 mexe no span interno da mesma tag (outra propriedade).'),
  },
  'F-medio-4': {
    clausulaSustenta: s(true, 'table__designer Cores: "Header da Tabela | background | --gray-5".'),
    especificoDoDS: s(true, 'Token de cor do header da Table.'),
    conformeHoje: s(true, 'Medido: todas as 9 th com rgb(240,240,240).'),
    observavel: s(true, 'Simulado: th "Téc. Adm." rgb(255,255,255), demais rgb(240,240,240).'),
    nivelCorreto: s(true, 'Percebido pela inconsistência com as outras células do mesmo header.'),
    realista: s(true, 'Estilo inline copiado ao adicionar coluna.'),
    injetavelNoFonte: s(true, 'processos.component.html linha 72.'),
    independente: s(true, 'Nenhum outro candidato toca o fundo do header.'),
  },
  'F-medio-5': {
    clausulaSustenta: s(true, 'pagination__designer: nos módulos com escolha, "deve-se utilizar o componente select personalizado, onde o seu input ... estará em densidade alta, sem contorno".'),
    especificoDoDS: s(true, 'Composição da paginação do DS.'),
    conformeHoje: s(true, 'Medido: inputs "total" e "page" com border 1px solid transparente, 32px.'),
    observavel: s(true, 'Simulado: input do "Exibir" com borda rgb(136,136,136); "Página" segue transparente.'),
    nivelCorreto: s(true, 'Evidente ao comparar os dois selects da mesma barra.'),
    realista: s(true, 'Reaproveitar select de formulário com borda.'),
    injetavelNoFonte: s(true, 'Classe no template da paginação + regra em src/styles.css (app). RISCO: depende de estilo global alcançar o input do componente filho br-select-pnip.'),
    independente: s(true, 'F-muito-dificil-4 usa o mesmo select, mas outro elemento (item da lista) e outra propriedade.'),
  },
  'F-medio-6': {
    clausulaSustenta: s(true, 'pagination__designer Cores/Interativo: "Texto Módulos | color | --color-secondary-08"; a informação "1–9 de 9 itens" é texto de módulo não interativo.'),
    especificoDoDS: s(true, 'Token de cor da paginação.'),
    conformeHoje: s(true, 'Medido: texto rgb(51,51,51) = --color-secondary-08 (#333), igual aos rótulos Exibir/Página.'),
    observavel: s(true, 'Simulado: texto rgb(19,81,180) enquanto rótulos seguem rgb(51,51,51).'),
    nivelCorreto: s(true, 'Só destoa comparando com os outros textos da mesma paginação.'),
    realista: s(true, 'Destacar o total com a cor "da marca".'),
    injetavelNoFonte: s(true, 'govbr-custom-pagination.component.html (template do app).'),
    independente: s(true, 'Nenhum outro candidato toca esse texto.'),
  },
  'F-dificil-1': {
    clausulaSustenta: s(false, 'A tabela de iconografia da paginação pede angle-left/right, mas fundamentos-visuais/iconografia.md (tabela de ícones por ação, "É fundamental que ... utilizem os ícones abaixo com mesma ação") atribui fa-chevron-left a "Voltar" e fa-chevron-right a "Avançar". O depois é defensável pela documentação: há contradição.'),
    especificoDoDS: s(true, 'Iconografia do DS.'),
    conformeHoje: s(true, 'Medido: classes "fas fa-angle-left" e "fas fa-angle-right".'),
    observavel: s(true, 'Simulado: classes passam a fa-chevron-*; mensurável no DOM.'),
    nivelCorreto: s(true, 'Parece correto; só a especificação revela.'),
    realista: s(true, 'Chevron é usado em outros componentes do DS.'),
    injetavelNoFonte: s(true, 'govbr-custom-pagination.component.html.'),
    independente: s(true, 'Nenhum outro candidato toca as setas.'),
  },
  'F-dificil-2': {
    clausulaSustenta: s(true, 'avatar__designer "1. Superfície circular (Obrigatório)": "A representação do usuário deve estar contida em uma superfície circular".'),
    especificoDoDS: s(true, 'Anatomia do Avatar do DS.'),
    conformeHoje: s(true, 'Medido: span.content 40×40, border-radius 50%.'),
    observavel: s(true, 'Simulado: border-radius 4px (quadrado arredondado).'),
    nivelCorreto: s(true, 'Avatar quadrado parece intencional; só a regra do DS revela.'),
    realista: s(true, 'Uniformizar raio com selos/tags do cabeçalho.'),
    injetavelNoFonte: s(true, 'header.component.html linha 7 (layout do app), estilo inline.'),
    independente: s(true, 'F-dificil-6 toca o botão que contém o avatar, outro elemento/propriedade.'),
  },
  'F-dificil-3': {
    clausulaSustenta: s(true, 'button__designer Tipografia: "Rótulo (Padrão) ... Text-transform none".'),
    especificoDoDS: s(true, 'Tipografia do Button do DS.'),
    conformeHoje: s(true, 'Medido: botão interno text-transform none, "Limpar filtros" (desabilitado, opacidade 0.45, visível).'),
    observavel: s(true, 'Simulado (classe text-uppercase no host): botão interno text-transform uppercase, "LIMPAR FILTROS".'),
    nivelCorreto: s(true, 'Caixa alta parece escolha de estilo; só a especificação revela.'),
    realista: s(true, 'Convenção de outros design systems.'),
    injetavelNoFonte: s(true, 'multiple-search-table.utils.ts. RISCO: depende de text-transform ser herdado para dentro do shadow root (funcionou no navegador).'),
    independente: s(true, 'Nenhum outro candidato toca esse rótulo.'),
  },
  'F-dificil-4': {
    clausulaSustenta: s(true, 'table__designer Espaçamentos: Linhas padrão 2x (16px), baixa 3x (24px), alta base (8px); 12px não corresponde a nenhuma densidade.'),
    especificoDoDS: s(true, 'Tokens de densidade da Table.'),
    conformeHoje: s(true, 'Medido: td 16px 24px; th 16px 24px (densidade padrão).'),
    observavel: s(true, 'Simulado: td 12px 24px; th segue 16px 24px.'),
    nivelCorreto: s(true, 'Tabela continua com aparência normal; só a medição revela.'),
    realista: s(true, 'Compactar linhas "no olho".'),
    injetavelNoFonte: s(true, 'processos.component.scss (estilo da rota; td está no template da rota, encapsulamento emulado alcança).'),
    independente: s(true, 'F-facil-2 toca td da coluna 5 em outras propriedades.'),
  },
  'F-dificil-5': {
    clausulaSustenta: s(true, 'estados.md "Especificação para Estado Interativo": background/foreground sobre fundo claro --blue-warm-vivid-70; o link do nº do processo é elemento interativo.'),
    especificoDoDS: s(true, 'Token da cor de interação do DS.'),
    conformeHoje: s(true, 'Medido: 9 links com rgb(19,81,180) = #1351B4.'),
    observavel: s(true, 'Simulado: links rgb(0,94,162) = #005EA2.'),
    nivelCorreto: s(true, 'Continua parecendo link azul; só o token revela.'),
    realista: s(true, 'A própria tabela usa text-blue-vivid-60 no header.'),
    injetavelNoFonte: s(true, 'processos.component.html linha 87.'),
    independente: s(true, 'Nenhum outro candidato toca esses links.'),
  },
  'F-dificil-6': {
    clausulaSustenta: s(false, 'A tabela de cores é do Sign-in (botão de autenticar). header__designer diz que o botão de autenticar "É apresentado apenas quando o usuário estiver deslogado. Após o login, ele será substituído pelo Avatar." O elemento medido é o gatilho do usuário logado; nada estabelece que ele seja um sign-in de ênfase secundária. A cláusula não é normativa para este caso.'),
    especificoDoDS: s(true, 'Cor de componente do DS.'),
    conformeHoje: s(true, 'Medido: background rgb(248,248,248), 40px, pílula.'),
    observavel: s(true, 'Simulado: background rgb(232,245,255).'),
    nivelCorreto: s(true, 'Parece coerente; só uma tabela de cores revelaria.'),
    realista: s(true, 'Harmonizar com o selo de perfil.'),
    injetavelNoFonte: s(true, 'header.component.scss (o botão está no template do header).'),
    independente: s(true, 'F-dificil-2 toca o avatar interno (outro elemento).'),
  },
  'F-muito-dificil-1': {
    clausulaSustenta: s(true, 'select__designer "Sombra no componente list": "uma sombra deve ser utilizada"; especificação Sombra Superfície --surface-shadow-md.'),
    especificoDoDS: s(true, 'Elevação do Select/List do DS.'),
    conformeHoje: s(true, 'Medido com a lista aberta (Tipo de processo): position absolute, z-index 1, box-shadow rgba(0,0,0,0.16) 0 3px 6px. Fechada, a lista não existe.'),
    observavel: s(true, 'Simulado (estilo inline): box-shadow none com a lista aberta.'),
    nivelCorreto: s(true, 'Exige abrir o filtro e a regra do select.'),
    realista: s(true, 'Visual "flat".'),
    injetavelNoFonte: s(true, 'multiple-search-table.utils.ts, estilo inline (vence a regra do DS).'),
    independente: s(true, 'F-muito-dificil-6 toca itens da mesma lista, outra propriedade; F-muito-dificil-2 usa a lista só como caminho.'),
  },
  'F-muito-dificil-2': {
    clausulaSustenta: s(true, 'tag__designer "Alinhamento [tag de Interação]": Icon --spacing-horizontal-left, Tertiary-button --spacing-horizontal-right — o botão fechar fica à direita.'),
    especificoDoDS: s(true, 'Anatomia/alinhamento da tag do DS.'),
    conformeHoje: s(true, 'Medido após selecionar a 1ª opção: ícone x=104, rótulo x=132, fechar x=294 (extremidade direita).'),
    observavel: s(true, 'Simulado: fechar x=116, ícone x=118, rótulo x=172; o botão continua removendo o filtro.'),
    nivelCorreto: s(true, 'A tag só existe após interação e a posição só é erro pela especificação.'),
    realista: s(true, 'Padrão "chip" de outras bibliotecas.'),
    injetavelNoFonte: s(true, 'multiple-search-table.utils.ts (reordenar elementos do template), função preservada.'),
    independente: s(true, 'Nenhum outro candidato toca a tag selecionada.'),
  },
  'F-muito-dificil-3': {
    clausulaSustenta: s(true, 'estados.md "Especificação para Estado Desabilitado": opacity --surface-opacity-md, cursor not-allowed.'),
    especificoDoDS: s(true, 'Tokens do estado desabilitado do DS.'),
    conformeHoje: s(true, 'Medido na aba Aguardando análise: 9 "Assumir" disabled, opacity 0.45, cursor not-allowed (na aba inicial não existem).'),
    observavel: s(true, 'Simulado: opacity 1, cursor pointer; clique de mouse bloqueado.'),
    nivelCorreto: s(true, 'Exige trocar de aba e conhecer a especificação.'),
    realista: s(true, 'Bloquear por CSS em vez de disabled.'),
    injetavelNoFonte: s(false, 'A mudança quebra a função: sem disabled o botão interno recebe foco e Enter executa assumirProcesso — medido: a página navegou para /processos/alteracao-certificado/… com um perfil para o qual a ação estava bloqueada. "O clique continua sem efeito" só vale para mouse.'),
    independente: s(true, 'F-muito-dificil-5 foca o item de aba, não toca os botões.'),
  },
  'F-muito-dificil-4': {
    clausulaSustenta: s(true, 'estados.md "Especificação para Estado Selecionado": background/foreground --blue-warm-vivid-50.'),
    especificoDoDS: s(true, 'Token do estado selecionado do DS.'),
    conformeHoje: s(true, 'Medido com a lista do "Exibir" aberta: item "10" selecionado, background rgb(38,112,232) = #2670E8, texto branco.'),
    observavel: s(true, 'Simulado: background rgb(19,81,180) = #1351B4.'),
    nivelCorreto: s(true, 'Exige abrir o select e conhecer o token; visualmente continua azul.'),
    realista: s(true, 'Usar a cor primária do tema.'),
    injetavelNoFonte: s(true, 'src/styles.css ou estilos de br-select.component.ts (componente do app, não a biblioteca). RISCO: estilo global alcançando o componente filho; regra global também atinge o select "Página".'),
    independente: s(true, 'F-medio-5 toca o input do mesmo select (outro elemento/propriedade).'),
  },
  'F-muito-dificil-5': {
    clausulaSustenta: s(true, 'estados.md "Especificação para Foco": border fundo claro --gold-vivid-40; "Especificação para Estado Foco": style dashed.'),
    especificoDoDS: s(true, 'Cor/estilo do foco do DS; o foco continua visível (WCAG 2.4.7 atendido), então é só do DS.'),
    conformeHoje: s(true, 'Medido via Tab: botão "Aguardando análise" no shadow de br-tab com outline rgb(194,133,12) dashed 4px, offset -4px.'),
    observavel: s(true, 'Simulado (variáveis no host): outline rgb(19,81,180) solid 4px.'),
    nivelCorreto: s(true, 'Só aparece com teclado e só é erro pela especificação.'),
    realista: s(true, 'Tematizar o foco com a cor da marca.'),
    injetavelNoFonte: s(true, 'processos.component.html linha 13 (style no host). RISCO: depende de custom properties atravessarem o shadow root de br-tab (funcionou no navegador).'),
    independente: s(true, 'Nenhum outro candidato toca o foco das abas.'),
  },
  'F-muito-dificil-6': {
    clausulaSustenta: s(true, 'estados.md "Especificação para Estado Hover": overlay da cor do primeiro plano, opacity --surface-opacity-xs — um hover sem overlay violaria.'),
    especificoDoDS: s(true, 'Especificação de estado do DS.'),
    conformeHoje: s(true, 'Medido com a lista aberta e mouse sobre o 2º item: background-image linear-gradient(rgba(51,51,51,0.16)…), fundo branco, rótulo #333.'),
    observavel: s(false, 'A regra proposta perde em especificidade para a do DS (.br-select .br-item:not([disabled]):not(:disabled):hover). Simulado: o overlay rgba(51,51,51,0.16) permanece, fundo fica rgb(19,81,180) e o rótulo continua rgb(51,51,51). O depois descrito ("sem overlay", texto branco) não ocorre, e o resultado real não viola a cláusula citada (overlay intacto).'),
    nivelCorreto: s(true, 'Exige abrir a lista e passar o mouse.'),
    realista: s(true, 'Hover "forte" é plausível.'),
    injetavelNoFonte: s(true, 'src/styles.css (app). RISCO: estilo global sobre itens do DS.'),
    independente: s(true, 'F-muito-dificil-1 toca a sombra da mesma lista (outra propriedade).'),
  },
};

const out = cands.map(c => {
  const v = V[c.id];
  const criterios = { clausulaLiteral: s(true, LIT + ` Arquivo: ${c.clausula.arquivo}.`), ...v };
  const falhas = K.filter(k => !criterios[k].ok);
  const risco = /RISCO:/.test(criterios.injetavelNoFonte.evidencia) ? criterios.injetavelNoFonte.evidencia.split('RISCO:')[1].trim() : undefined;
  const o = { id: c.id, nivel: c.nivel, ordem: c.ordem, aprovado: falhas.length === 0, criterios: Object.fromEntries(K.map(k => [k, criterios[k]])) };
  if (risco) o.risco = risco;
  if (falhas.length) o.motivoReprovacao = falhas.map(k => `${k}: ${criterios[k].evidencia}`).join(' | ');
  return o;
});
fs.writeFileSync(`${OUT}/veredictos.json`, JSON.stringify(out, null, 2));

// markdown
const sim = b => (b ? 'sim' : '**NÃO**');
let md = `# Conferência dos candidatos — Tela F\n\nConferente independente. Página: \`/pnip-d/portal-mpa/processos?mock-perfil=mpa\`, 1280×900, Chromium headless. Método em \`metodo.md\`.\n\n`;
const niveis = ['facil', 'medio', 'dificil', 'muito-dificil'];
md += `## Resumo\n\n| Nível | Aprovados | Reprovados (ordem) |\n|---|---|---|\n`;
for (const n of niveis) { const l = out.filter(o => o.nivel === n); md += `| ${n} | ${l.filter(o => o.aprovado).length}/${l.length} | ${l.filter(o => !o.aprovado).map(o => o.ordem).join(', ') || '—'} |\n`; }
md += `\nTotal: ${out.filter(o => o.aprovado).length}/${out.length} aprovados; ${out.filter(o => o.aprovado && o.risco).length} aprovados com risco de injeção.\n\n`;
md += `Reprovações por critério: ${K.map(k => `${k} ${out.filter(o => !o.criterios[k].ok).length}`).join(' · ')}\n\n`;
md += `## Tabela\n\n| id | nível | ordem | ${K.join(' | ')} | aprovado |\n|---|---|---|${K.map(() => '---').join('|')}|---|\n`;
for (const o of out) md += `| ${o.id} | ${o.nivel} | ${o.ordem} | ${K.map(k => sim(o.criterios[k].ok)).join(' | ')} | ${o.aprovado ? (o.risco ? 'sim (risco)' : 'sim') : '**não**'} |\n`;
md += `\n## Notas por candidato\n\n`;
for (const o of out) {
  md += `### ${o.id} — ${o.aprovado ? 'APROVADO' : 'REPROVADO'}\n\n`;
  for (const k of K) md += `- **${k}** (${o.criterios[k].ok ? 'sim' : 'não'}): ${o.criterios[k].evidencia}\n`;
  if (o.risco) md += `- **risco**: ${o.risco}\n`;
  md += '\n';
}
md += `## Notas de independência entre aprovados\n\n- F-facil-4 corta o lado direito do Exportar, que é a referência de comparação de F-medio-2; o lado esquerdo continua pílula, então F-medio-2 segue observável.\n- F-facil-6 faz o Voltar cobrir parte do select "Página", referência de comparação de F-medio-5; o select defeituoso ("Exibir") não é coberto.\n- F-medio-5 e F-muito-dificil-4 estão no mesmo select "Exibir", em elementos e propriedades diferentes.\n- Componentes compartilhados do app (search-table, multiple-search-table, paginação, header, br-select) são código da aplicação, não da biblioteca DS; mudá-los afeta outras rotas da mesma cópia /pnip-d/, não a página medida de outro modo.\n`;
fs.writeFileSync(`${OUT}/veredictos.md`, md);
console.log(md.split('## Tabela')[0]);
