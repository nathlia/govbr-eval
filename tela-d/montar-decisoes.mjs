/**
 * Monta tela-d/decisoes.json: uma linha por regra da base normativa 3.7.0 (rules.jsonl, 186 regras; as
 * 45 com emagReferences são as recomendações do e-MAG 3.1) × a tela D (processos do portal MPA) nas 2
 * paradas escolhidas (inicial, lista-exibir) — método da B § 3.2–3.3 (tela-b/metodo-auditoria.md),
 * adendos da B e da D (tela-d/metodo-auditoria-adendo-processos.md, sha256 d9989b53…2b513).
 *
 * Lê SÓ texto de norma, da cópia ds-rules/06 (a mesma base normalizada de 186 regras da B e da C; o
 * auditor cego da D não abre govbr-ds-validator/ — auditoria.md § 1). As decisões estão escritas abaixo,
 * à mão, com a medida que as sustenta (inventario.json, estados.json, conferir-auditoria.mjs). Regra sem
 * decisão explícita cai num padrão declarado pela força e pelo componente — e o script PARA se uma regra
 * required/prohibited de componente presente ou global ficar sem decisão explícita. Nenhum filtro por
 * automatable, automationConfidence ou validationStrategy.
 *
 * Uso: node tela-d/montar-decisoes.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
export const KB = join(AQUI, "../../ds-rules/06/govbr-ds-knowledge/versions/3.7.0/normalized/rules.jsonl");
const textoKB = readFileSync(KB, "utf8");
const regras = textoKB.trim().split("\n").map(l => JSON.parse(l));

/** Componentes do DS visíveis em alguma parada (inventario.json › componentes; classe/tag br-*), mais o
 * checkbox nativo da tabela (a regra de uso do Checkbox fala do controle, não da classe). */
const PRESENTES = new Set(["header", "button", "divider", "avatar", "signin", "breadcrumb", "input", "select", "tab", "tag", "table", "pagination", "list", "item", "radio", "checkbox"]);
const NAO_VISIVEIS = new Set([]);

const NA = motivo => ({ veredito: "não-aplicável", destino: "registro", medida: motivo });
const NM = (escalada, medida) => ({ veredito: "não-mensurável", destino: "escalada", escalada, medida });
const OK = medida => ({ veredito: "conforme", destino: "registro", medida });
const V = (unidades, medida) => ({ veredito: "viola", destino: "unidade", unidades, medida });

const SEM_FONTE = "a tela é um build congelado (JS/CSS minificados, sem fonte: telas.json › sources vazio); a regra fala do código-fonte ou do processo, que a página não responde";
const PROCESSO = "regra dirigida ao processo ou à equipe, não a um observável da página";

const D = {
  // ---------- componentes presentes (F1)
  "accessibility-breadcrumb-992f162ca821": OK("Tab real (inventário, ordemTab) alcança o link \"Home\" do <br-breadcrumb> (e o botão circular dentro dele); o item atual \"Processos\" não é link. Par elegível breadcrumb-tab."),
  "accessibility-input-6fe41e804955": OK("Tab real alcança os três campos visíveis na ordem do DOM: pesquisa (\"Pesquise aqui ...\"), \"Exibir\" e \"Página\" da paginação."),
  "accessibility-list-03813ffeeb42": NM("E-05", "lista-exibir: a lista do seletor \"Exibir\" (div.br-list tabindex=0, quatro br-item com rádio) recebe foco por Tab a partir do campo, e o Tab seguinte leva o foco ao <body>: nenhum item é alcançado por Tab/Shift+Tab. Mesma marcação e mesmo comportamento do seletor da tela C (E-03 de lá, decisão pendente)."),
  "accessibility-tab-f1807d71dc5f": OK("as três abas são <button> alcançados por Tab; Enter produz o mesmo resultado do clique em 3/3 cargas nas três (teste de estados: \"Aguardando análise\" e \"Concluídos\" trocam a lista, \"Tramitando\" — a ativa — não faz nada nos dois gestos). O nome acessível das abas (\"AGUARDANDO_ANALISE\", \"TRAMITANDO\", \"HISTORICO\" = id do br-tab-item, sem a prop aria-label) é registro sem norma no universo (auditoria.md § 6)."),
  "component-avatar-81c7524692f0": OK(".br-avatar .content do cabeçalho: 40×40 px, border-radius 50% (casco da aplicação; não entra como controle)."),
  "component-button-4d7b5f978df1": V(["D-01"], "inicial: os 18 botões de ação das linhas da tabela \"Ver processo\" (9) e \"Desassociar processo do analista responsável\" (9, 8 deles desabilitados) são <br-button> sem `label` e sem `circle`: o <button> interno (br-button middle) tem 72×40 px, raio 1680 px (pílula, não círculo), nenhum texto visível — só o ícone br-icon-base projetado — e o nome vem só do `title`. O \"Assinar\" (3), \"Exportar\", \"Voltar\" e \"Limpar filtros\" têm rótulo visível; os circulares (Página anterior/seguinte, Home, Menu) estão na exceção."),
  "component-checkbox-6923ae0af84f": OK("os checkboxes da tabela servem à seleção de uma ou mais linhas (seleção múltipla; um no cabeçalho). O rótulo deles → D-04."),
  "component-input-3788829b08fe": OK("ação interna do campo de pesquisa (\"Buscar\"): button.br-button só com ícone de lupa, sem primary/secondary (terciário), 32×32, border-radius 50% computado (o core 3.4.1 desenha .br-input .br-button circular) — a marcação autoral não tem as classes circle/small, mas o computado é o da regra. O tamanho do alvo (32×32, também do core) → E-03, fora (D-135)."),
  "component-list-8f67e7cc7677": OK("lista-exibir: os quatro br-item da lista do seletor têm o mesmo padding computado (16px 16px) e alturas 53/53/53/52 px."),
  "component-signin-2752fd23bbe8": OK("o Sign-in (\"U Olá, Usuária de Teste, SUPERVISOR\") ocupa uma linha: 392×40 px (casco)."),
  "component-table-7c605ca2f85e": OK("a tabela tem 9 colunas (9 th no thead, 9 td por linha)."),
  "accessibility-divider-30bbcbf3a17c": OK("o <br-divider> abaixo do breadcrumb e os dois span.br-divider da paginação: fora do Tab (tabIndex -1) e sem papel na árvore do Chromium. Par elegível divisor."),
  "component-item-c806c8feda5a": OK("br-item usado para as opções repetidas da lista do seletor \"Exibir\" (10, 25, 50, 100)."),
  "component-item-739294d90299": OK("os br-item da lista contêm só um br-radio (rádio + rótulo): nenhum Button primário nem navegação."),
  "component-item-a10751502b98": OK("padding computado dos br-item = 16px (= --spacing-scale-2x do core); nenhum estilo autoral no item."),
  "component-item-cb34ed616246": OK("cada br-item tem superfície (70×53) e conteúdo (rádio + rótulo)."),
  "component-item-a6d29ea54434": OK("lista-exibir: hover sobre o br-item aplica gradiente em toda a superfície; clique perto da borda do item (fora do texto) escolhe a opção. Par elegível item-superficie."),
  // ---------- globais: desenvolvimento
  "development-global-406774b1cb87": OK("font-family computado de todo texto visível nas 2 paradas = \"Rawline, Raleway, sans-serif\"."),
  "development-global-a43ad8231ad0": OK("<head>: rawline.css → raleway.css → Font Awesome → styles.css (core 3.4.1 empacotado) — fontes antes do CSS do DS."),
  "development-global-137c50bea6ca": NA(SEM_FONTE + ". O observável (cores computadas) está em foundation-global-21b1a2733f7b."),
  "development-global-659242ecda1d": NA(SEM_FONTE),
  "development-global-5765f1b8d2bc": NA(SEM_FONTE),
  "development-global-8c92e4e83038": NA(PROCESSO),
  "development-global-9c1d24af4f37": NA("a página não carrega core.min.js: os componentes vêm dos web components 1.16.0 e do CSS do core; a inicialização é do Angular"),
  "development-global-d0dff372c137": NA(SEM_FONTE),
  "development-global-0052d80d4f92": NA(SEM_FONTE),
  "development-global-9826b6862644": OK("scripts sem type ou com type=\"module\"; nenhum type=\"text/javascript\"."),
  "development-global-63b44801da86": NA(SEM_FONTE),
  "development-global-dfebe85e65d8": NA(PROCESSO),
  "development-global-067a1786b481": NA(SEM_FONTE),
  "development-global-b491c2e2c1a0": NA("o HTML da rota é gerado pelo Angular em tempo de execução; a forma das aspas não existe no DOM"),
  // ---------- globais: fundamentos (F3)
  "foundation-global-0578aa6c2828": NM("E-08", "colunas (.row > .col-*) com o padding do grid do core 3.4.1 congelado (24 px entre colunas), não CSS autoral; a KB 3.7.0 diz 40 px. Valor que difere só entre a versão da página e a da norma (método § 1.4; como a E-08 da B e da C)."),
  "foundation-global-21b1a2733f7b": OK("cores computadas (texto, fundo, bordas) de todo elemento visível nas 2 paradas — 15 na inicial, 17 na lista-exibir, inclusive os fundos dos status (#e66f0e orange-vivid-40, #8289ff indigo-vivid-40, #888888 secondary-06, indigo-vivid-60) — todas presentes em tokens/colors.json 3.7.0; nenhuma fora da paleta. O contraste das combinações → D-06."),
  "foundation-global-1c0146e93d2e": NM("E-02/E-03", "ícones interativos abaixo de 48×48: \"Buscar\" e os dois \"Exibir lista\" (32×32) recebem tamanho e raio da regra .br-input .br-button do core 3.4.1 — **decidido fora pela autora (E-03, D-135)**: estilo do DS, fundo; os de 40 px (ícones das linhas 72×40, Página anterior/seguinte 40×40) são a densidade padrão do Button — **fora (E-02, D-135)**. Menu e Home 32×32 são dos web components (fundo). Na candidata (288fd5d) esta linha era a unidade D-09, removida."),
  // ---------- globais: página, padrões, templates (F2)
  "page-global-f6e03bce515b": NA("regra-guarda sem observável próprio: é medida pelas demais linhas desta tabela"),
  "pattern-global-eb8c1606a52e": NA("a lista tem dados nas 2 paradas (9 linhas): não há estado vazio a informar"),
  "pattern-global-03695a4aede0": NA("a lista tem dados nas 2 paradas: não há Empty State"),
  "pattern-global-9d9f1c9bf1ed": OK("nenhum título, rótulo, botão, item de menu ou mensagem recortado (scrollWidth = clientWidth; o \"Meus processos\" tem a classe text-truncate, mas cabe); único recorte medido é o texto visualmente oculto \"Home\" (sr-only) do breadcrumb do web component."),
  "pattern-global-abaec84ff915": NA("não há onboarding"),
  "pattern-global-a633e540aa5c": NA("a tela não é a página inicial do produto"),
  "pattern-global-5717506ac2e6": NM("E-07", "nenhum link ou item de ajuda nas paradas (precedente E-16 da B, D-61: não-aplicável)"),
  "pattern-global-eebb093156e7": NA("não há Collapse nas paradas"),
  "template-global-19f93475dc5e": NM("E-07", "estrutura: cabeçalho (br-header + pnip-header), breadcrumb, main; nenhum rodapé nem skip link. Casco da aplicação, **exposto** (precedente E-02 da B, D-61: fora)"),
  "template-global-9cbfa5906031": NA("a tela não é tela de erro"),
  // ---------- globais: acessibilidade (e-MAG, F4)
  "accessibility-global-7e6420514860": V(["D-10"], "inicial: o <iframe> filho direto de <pnip-mpa-processos> (sem src, documento about:blank vazio, 1160×500, sem title nem name) é um ponto de Tab sem nome (papel Iframe, nome \"\" na árvore do Chromium)."),
  "accessibility-global-1cb2c878824b": OK("tabela para os dados tabulares, títulos de coluna em th, listas para breadcrumb e paginação; o uso de <a role=button> e <span> como controles está nas unidades D-02/D-03 (2f22b7245ef9)."),
  "accessibility-global-3ac0aaa53900": V(["D-12"], "um só título visível, <h2> \"Processos\"; nenhum <h1> na página (light + shadow). **exposto** (casco: ordem de títulos, como C-05)"),
  "accessibility-global-79db88c7f55d": OK("ordem do Tab = ordem do DOM e da leitura (cabeçalho → breadcrumb → Exportar → abas → pesquisa → tabela, linha a linha → paginação → Voltar); nenhum tabindex positivo; os tabindex do seletor (lista 0, itens e \"Exibir lista\" -1) são os do padrão Select. O passo de Tab que sai da lista aberta para o <body> → E-05."),
  "accessibility-global-7d2b85f81c52": V(["D-11"], "nenhuma âncora \"#…\" nem .br-skiplink nas 2 paradas; o primeiro ponto de Tab é o botão Menu do cabeçalho. **exposto** (casco)"),
  "accessibility-global-206c9fa6ae11": OK("a única <table> traz dados tabulares (processos × colunas); nenhuma tabela de diagramação."),
  "accessibility-global-cf61b3eb3c71": OK("o breadcrumb tem um só link (Home) e o item atual em <li> próprio; a paginação tem cada controle em <li>."),
  "accessibility-global-bfba9c1f5026": NM("E-07", "marcos: banner, main, três navigation (abas, \"Paginação de resultados\", \"paginação\"); nenhum contentinfo. Casco, **exposto** (precedente E-02 da B, D-61: fora)"),
  "accessibility-global-5be1f553cc03": OK("nada abre sem ação da usuária: nenhum diálogo, janela ou aba na carga (0 diálogos visíveis); a lista do seletor só abre no clique do campo."),
  "accessibility-global-e6fd5e1247de": V(["D-02", "D-03"], "inicial: (D-02) os 9 números de processo são <a role=\"button\"> sem href nem tabindex — não focáveis (fora do Tab real; a árvore não os marca focusable) — e o clique abre a sub-rota …/documentos (linhas 2, 3, 4, 6, 7, 9), que nenhum outro controle da tela alcança (\"Ver processo\" abre a rota do processo sem /documentos); nas linhas 1, 5 e 8 o destino do mock cai em /login (artefato, adendo § C); (D-03) as 7 etiquetas interativas (\"Meus processos\" e os 6 filtros \"Aberto há\", \"Tipo de processo\", \"Status\", \"Espécie alvo\", \"Método de pesca\", \"Petrecho\") são <span class=\"br-tag interaction\"> com tabIndex -1: o clique liga/desliga o filtro (9→10 linhas) ou abre a lista de opções do filtro, e nenhuma delas é alcançada por Tab. O ciclo iframe↔body do Tab → E-01."),
  "accessibility-global-f639993e9416": V(["D-02", "D-03"], "mesma medida da linha anterior: os filtros e a abertura dos documentos (scripts do Angular) só funcionam com mouse."),
  "accessibility-global-cd5de9a6f164": OK("nenhum meta http-equiv refresh; endereço e conteúdo estáveis por 1 s em cada parada (conferir-paradas da fase 1)."),
  "accessibility-global-d6e816588306": OK("nenhum meta refresh."),
  "accessibility-global-5d366ef29b04": NA("não há tarefa com limite de tempo"),
  "accessibility-global-8faca42c2c9a": OK("document.getAnimations() = 0 nas 2 paradas; nenhum GIF/vídeo."),
  "accessibility-global-33b13d9fa271": OK("nenhum conteúdo em movimento (0 animações)."),
  "accessibility-global-698e0a4783a9": OK("<html lang=\"pt-br\">."),
  "accessibility-global-1ccbc61dddbc": V(["D-08"], "inicial: o último <th> do cabeçalho (coluna das ações) é vazio — nome \"\" na árvore (columnheader sem nome) — precedente B-26 (D-61: th vazio da coluna de ações vira unidade). Os demais th têm texto e scope=col; o th da coluna de seleção não tem texto nem scope (o rótulo do checkbox dele → D-04)."),
  "accessibility-global-fb83eab75d8d": NM("E-07", "texto fixo do template; linguagem simples fora do escopo (§ 6; precedente E-12 da B: fora)"),
  "accessibility-global-20c08f26d8e8": NM("E-07", "abreviaturas no texto fixo sem expansão nem <abbr>: \"Nº Processo\", \"Téc. Adm.\" (cabeçalhos), PNIP (título); HS, CAOL, SFPA vêm dos dados do mock (fora). Precedente E-12 da B: fora"),
  "accessibility-global-1db13803cbf8": OK("nenhum trecho autoral em outro idioma nas paradas."),
  "accessibility-global-5d5a5f21d94b": V(["D-13"], "<title>PNIP</title>; o conteúdo principal é \"Processos\" (h2). O título só nomeia o sistema. **exposto** (casco; precedente B-25, decidido pela autora no D-61)"),
  "accessibility-global-75c11ccac582": OK("<br-breadcrumb> \"Home › Processos\" indica a localização atual."),
  "accessibility-global-cdfbb56eebc5": OK("links com texto claro: \"Home\" (breadcrumb) e \"1\" dentro da navegação \"Paginação de resultados\"; os números de processo são role=button (D-02)."),
  "accessibility-global-3a3e47354c53": NA("a única imagem visível é o logo do <br-header> (alt=\"logo\" fixo no web component — fundo); o ícone do \"Sair\" só existe no menu do avatar, fechado nas paradas; os ícones dos botões são Font Awesome com aria-hidden"),
  "accessibility-global-609e3494150c": NA("não há mapa de imagem"),
  "accessibility-global-3a57435c3b32": NA("nenhum documento para download nas paradas (\"Exportar\" navega para outra rota, fora)"),
  "accessibility-global-cd705eb5da2a": V(["D-07"], "inicial: a <table> dos processos não tem <caption> nem aria-label/aria-labelledby (o h2 \"Processos\" fica fora do contêiner da tabela, sem associação). Nos exemplos oficiais da Table 3.7.0 há <caption> (examples/html/table.json: 1 caption em 3 tabelas)."),
  "accessibility-global-cb09bc0c77c0": V(["D-06", "D-14"], "contraste pela fórmula da WCAG (cor computada × primeiro fundo opaco), 105 textos na inicial e 109 na lista-exibir: (D-06) os textos brancos dos status sobre bg-orange-vivid-40 #e66f0e = 3,16:1 (5 linhas), bg-indigo-vivid-40 #8289ff = 3,01:1 (1), bg-secondary-06 #888888 = 3,54:1 (2), 14 px/500 — 8 de 9 status abaixo de 4,5:1 (o \"Em revisão analista\" sobre indigo-vivid-60 = 6,49:1 passa); (D-14) a inicial do avatar \"U\" branco sobre #ff8c00 = 2,33:1 — **exposto** (casco). Todos os demais ≥ 4,61:1."),
  "accessibility-global-c2f94bdc17ce": NM("E-07", "a aba ativa (li.tab-item.active) indicada por classe (cor/sublinhado), sem aria-selected — a anatomia do web component br-tab (fundo); precedente E-03 da B: fora. Os status têm texto, não só cor."),
  "accessibility-global-d9c42f188e2c": NA("zoom 200 % fora do escopo (método § 1 e § 6: só 1280×900)"),
  "accessibility-global-21fbcc2fe37b": V(["D-10"], "Tab real (300 ms por tecla) nas 2 paradas: todo ponto tem indicador — outline dashed 4px rgb(194,133,12) (botões, links, abas, checkboxes nativos) ou box-shadow 0 0 0 2px rgb(194,133,12) (campos) — exceto o <iframe> vazio (D-10): focado, outline none, box-shadow none, :focus-visible false, nada muda na tela. A lista aberta do seletor mantém só a sombra que já tinha (core `.br-select .br-list:focus{outline:none}` — fundo, como na C)."),
  "accessibility-global-6c86b93df639": NA("não há vídeo"),
  "accessibility-global-dc45b57b8349": NA("não há áudio"),
  "accessibility-global-8f439a3c078c": NA("não há vídeo"),
  "accessibility-global-56cbcba602ce": NA("não há som"),
  "accessibility-global-6ea7ecc60c01": OK("nenhuma animação (0)."),
  "accessibility-global-dafac812b10b": NA("não há botão de imagem (input type=image)"),
  "accessibility-global-b95c42b61ed3": V(["D-04", "D-05"], "inicial: (D-04) os 7 <input type=checkbox> da tabela (1 no th, 6 nas linhas que os têm) sem <label>, aria-label ou aria-labelledby — labels.length 0, nome \"\" na árvore; (D-05) o campo de pesquisa (input#search no shadow do <br-input>, que recebeu placeholder mas não `label`) — labels.length 0, nome acessível = placeholder \"Pesquise aqui ...\". Conformes: \"Exibir\" e \"Página\" (label for no mesmo pai) e os 4 rádios da lista (par radio-rotulo)."),
  "accessibility-global-e101928665cc": OK("ordem do DOM = ordem visual (de cima para baixo, da esquerda para a direita)."),
  "accessibility-global-de1efebaf255": NM("E-04", "sair do campo de pesquisa vazio (foco + Tab) dispara nova consulta: a tabela some (0 linhas) e volta com as mesmas 9 linhas; endereço inalterado, nenhuma escrita. Se recarregar a lista ao sair do campo é \"mudança de contexto\" é juízo."),
  "accessibility-global-01b1806c30e9": NA("nenhum campo com formato ou regra de entrada não evidente: pesquisa livre e dois seletores de opções"),
  "accessibility-global-cc837bbaf713": NA("nenhuma mensagem de erro nas paradas"),
  "accessibility-global-11ffc5c577f6": NA("não há <form> nem grupo de campos de formulário relacionados: os filtros são etiquetas (D-03), a pesquisa é um campo só, os seletores da paginação têm rótulo próprio"),
  "accessibility-global-a8f7ce66b1c4": NA("não há CAPTCHA"),
  // ---------- globais: acessibilidade (DS)
  "accessibility-global-e038367bd7d6": V(["D-03"], "inicial: as etiquetas interativas (D-03) são <span> sem role (papel generic, nome \"\" na árvore), sem estado (o \"Meus processos\" liga/desliga sem aria-pressed; os filtros abrem lista sem aria-expanded/aria-haspopup). Os exemplos oficiais da Tag 3.7.0 só têm button e input+label como elementos interativos (examples/html/tag.json). O seletor da paginação sem role combobox/listbox → E-05."),
  "accessibility-global-695e4379e23f": NA(PROCESSO),
  "accessibility-global-1c3bd2a1c1a7": NA("outras janelas fora do escopo (§ 1 e § 6)"),
  "accessibility-global-41850b4791b8": V(["D-02", "D-03"], "mesma medida de e6fd5e1247de: os números de processo e as etiquetas interativas não são utilizáveis só com teclado."),
  "accessibility-global-b5fad7ce076d": V(["D-04", "D-05"], "mesma medida de b95c42b61ed3."),
  "accessibility-global-cb56ad444da2": NM("E-05", "lista-exibir: com a lista aberta e focada, um Tab deixa o foco no <body> (o próximo vai para o campo \"Página\"). Mesmo comportamento da C (E-04 de lá)."),
  "accessibility-global-2f22b7245ef9": V(["D-02", "D-03"], "inicial: controles construídos sem o elemento nativo — os números de processo são <a role=\"button\"> sem href (navegam, mas não são link nem botão operável), as etiquetas interativas são <span> com cursor:pointer."),
  "component-global-e30aab6e9a68": NM("E-07", "<br-header has-menu>: o botão Menu não produz efeito (clique e Enter, 0/3 no teste de estados); casco, **exposto** (precedente E-15 da B: fora)."),
};

const OBS = {
  "accessibility-button-efd2d9e7c3c6": "todos os botões habilitados visíveis, exceto \"Exibir lista\" (tabindex -1, padrão do Select), são alcançáveis por Tab; os \"Desassociar\" desabilitados (8) ficam fora, como deve.",
  "accessibility-button-41d9f439e103": "Enter produz o mesmo efeito do clique nos botões testados (abas, Exportar, Ver processo, Voltar: estados.json).",
  "accessibility-signin-a68a86f45877": "o Sign-in recebe foco por Tab; clique e Enter abrem o menu (3/3).",
  "component-radio-9cf59fa5bf60": "quatro rádios na lista do seletor (sem atributo name: não formam grupo).",
  "component-select-3d506ce4d7d3": "opções curtas: 10, 25, 50, 100.",
  "component-signin-837c5ed4fe6a": "rótulo do Sign-in: \"Olá, Usuária de Teste, SUPERVISOR\".",
  "component-table-88941e76c77b": "a coluna de seleção tem células vazias nas linhas 1, 5 e 8 (sem checkbox — dado do mock decide quais linhas são selecionáveis).",
  "component-table-8b8d4b403cb9": "não há barra de título da Table (as ações ficam no cabeçalho da página: Exportar).",
  "component-tag-7d70c8be6a0c": "nenhuma Tag de contagem.",
  "development-global-0b73051d7063": "nenhum CDN: todos os recursos vêm da árvore pnip-d/.",
  "development-global-c6889731433a": "Raleway declarada como alternativa depois de Rawline.",
  "development-global-4a614a5c88e2": "o app usa os web components 1.16.0 (br-header, br-button, br-input, br-breadcrumb, br-divider, br-tab, br-icon-base) e classes CSS do core (br-tag, br-table, br-pagination, br-select, br-list, br-item, br-radio).",
  "foundation-global-9ef740ba1f28": "main com container; filtros e paginação em grid do core.",
  "template-global-2387114907b1": "não há Skip Link (ver D-11).",
  "component-item-cb5d8f6d30b9": "os quatro br-item da lista com o mesmo padding.",
  "component-item-e08476d083e4": "os quatro br-item com a mesma largura (70 px).",
  "component-item-0e293b295c3d": "o item \"10\" (valor atual) tem a classe selected.",
  "component-pagination-7b0ffe97e848": "paginação contextual com os módulos: anterior/página/seguinte, \"Exibir\" e \"Página\".",
};

const familia = r => {
  if (r.emagReferences.length) return "F4";
  if (r.component) return "F1";
  if (["page", "template", "pattern"].includes(r.category) || r.subcategory === "grid") return "F2";
  if (r.category === "foundation" || r.subcategory === "font") return "F3";
  return "global";
};

export function montar() {
  const linhas = [];
  const faltando = [];
  for (const r of regras) {
    const curto = r.id.replace("govbr-3.7.0-", "");
    const base = { id: r.id, force: r.force, component: r.component, familia: familia(r), emag: r.emagReferences, wcag: r.wcagReferences, norma: r.normalizedRule };
    if (["example", "informative"].includes(r.force)) { linhas.push({ ...base, veredito: "não normatiza", destino: "nenhum", medida: `force ${r.force} (D-10, D-32)` }); continue; }
    if (["recommended", "discouraged", "permitted"].includes(r.force)) {
      const presente = !r.component || PRESENTES.has(r.component) || NAO_VISIVEIS.has(r.component);
      linhas.push({ ...base, veredito: "observação", destino: "observacao", medida: OBS[curto] ?? (presente ? "sem observável nas paradas" : "componente ausente da tela") });
      continue;
    }
    if (D[curto]) { linhas.push({ ...base, ...D[curto] }); continue; }
    if (r.component && NAO_VISIVEIS.has(r.component)) { linhas.push({ ...base, ...NA("componente presente no DOM, mas não visível em nenhuma parada escolhida") }); continue; }
    if (r.component && !PRESENTES.has(r.component)) { linhas.push({ ...base, ...NA("componente ausente da tela") }); continue; }
    faltando.push(r.id);
  }
  const sobras = Object.keys(D).filter(k => !regras.some(r => r.id === "govbr-3.7.0-" + k));
  return { linhas, faltando, sobras };
}

if (process.argv[1] && process.argv[1].endsWith("montar-decisoes.mjs")) {
  const { linhas, faltando, sobras } = montar();
  if (regras.length !== 186) { console.error(`a base tem ${regras.length} regras, esperadas 186`); process.exit(1); }
  if (faltando.length) { console.error(`regra required/prohibited sem decisão explícita:\n  ${faltando.join("\n  ")}`); process.exit(1); }
  if (sobras.length) { console.error(`decisão para regra inexistente: ${sobras.join(", ")}`); process.exit(1); }
  const contagem = {};
  for (const l of linhas) contagem[l.veredito] = (contagem[l.veredito] ?? 0) + 1;
  const saida = {
    _meta: {
      tela: "processos (tela D, substituta da C)",
      metodo: "tela-b/metodo-auditoria.md @ 5838702 + tela-b/metodo-auditoria-adendo-vistorias.md @ 9406aed + tela-d/metodo-auditoria-adendo-processos.md (final, sha256 d9989b53…2b513)",
      fonte: "ds-rules/06/govbr-ds-knowledge/versions/3.7.0/normalized/rules.jsonl (186 regras; as 45 com emagReferences são as recomendações do e-MAG 3.1)",
      fonteSha256: createHash("sha256").update(textoKB).digest("hex"),
      estados: "inicial · lista-exibir (tela-d/sequencia.mjs)",
      familias: "F1 componente presente · F2 Template Base/regras de página · F3 fundamentos (cor, tipografia, espaçamento, iconografia) · F4 e-MAG · global = regra global da KB fora das quatro",
      decisoes: "escaladas decididas pela autora em 2026-10-18 (D-135, NAT-92): E-03 fora (D-09 removida); E-01, E-02, E-04, E-05, E-08 fora; E-06 mantém; E-07 precedentes do D-61. Linhas não-mensurável mantêm o veredito e citam a escalada; a decisão está em ground-truth-processos.json › _meta.escaladas",
      destinos: "unidade (viola autoral) · escalada (não-mensurável → lista da autora, auditoria.md § 8) · registro · observacao · nenhum",
      contagem,
    },
    linhas,
  };
  writeFileSync(join(AQUI, "decisoes.json"), JSON.stringify(saida, null, 2) + "\n");
  console.log(`${linhas.length} linhas · ${Object.entries(contagem).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  console.log(`e-MAG: ${linhas.filter(l => l.emag.length).length} recomendações · fonte sha256 ${saida._meta.fonteSha256}`);
}
